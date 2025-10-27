# System Patterns

## Architecture Overview

Vanilla JavaScript PWA with modular architecture and config-driven design.

### Module Hierarchy (scripts/)
```
config.js (constants, no dependencies)
  ↓
utils.js (pure functions)
  ↓
storage.js (LocalStorage wrapper)
  ↓
task-manager.js (business logic)
  ↓
renderer.js (DOM manipulation)
  ↓
interaction-manager.js (event handlers)
  ↓
import-export-manager.js (data portability)
  ↓
sync.js, pomodoro.js, deadline-picker.js (features)
  ↓
app.js (orchestration)
```

**Rule**: Higher modules NEVER depend on lower modules. Each layer builds upward.

## Critical Technical Decisions

### Debounced Save/Render Pattern
**Decision**: Use debouncing for save (100ms) and render (16ms)
**Rationale**: Reduce LocalStorage writes and DOM manipulation overhead
**Impact**: Creates timing windows where operations can race with pending saves
**Mitigation**: Atomic save queue (Wave 1 fix)

```javascript
// scripts/app.js
Config.SAVE_DEBOUNCE_MS = 100;  // Save delay
Config.RENDER_DEBOUNCE_MS = 16; // Render delay (60fps)
```

### Atomic Save Queue (v1.22.0)
**Decision**: Use `splice(0)` instead of array reassignment
**Pattern**:
```javascript
// ❌ WRONG - Creates race condition
processSaveQueue() {
  this.saveQueue = [];  // New operations can arrive here
  Storage.save(this.data);
}

// ✅ CORRECT - Atomic operation
processSaveQueue() {
  const processedQueue = this.saveQueue.splice(0);  // Atomic!
  Storage.save(this.data);
  if (this.saveQueue.length > 0) {
    this.processSaveQueue();  // Recursive for new operations
  }
}
```

### Batch Operations Pattern (v1.22.0)
**Decision**: Collect all changes, then apply in single pass
**Pattern**:
```javascript
// ❌ WRONG - Multiple passes create intermediate inconsistent states
moveTaskToList(id, toList) {
  const task = find(id);
  removeFromSource(task);  // State inconsistent here!
  addToTarget(task);       // Race window
}

// ✅ CORRECT - Single-pass batch operation
moveTaskToList(id, toList) {
  // Phase 1: Collect all changes
  const tasksToMove = [];
  const tasksToRemove = [];
  // ... collection logic ...

  // Phase 2: Apply atomically
  this.data[fromList] = this.data[fromList].filter(t => !tasksToRemove.includes(t.id));
  tasksToMove.forEach(t => this.data[toList].push(t));
}
```

### v3 Data Format (Parent-Child Relationships)
**Decision**: Shared task references between lists (not deep copies)
**Invariant**: Child tasks ALWAYS in same list as parent
**Pattern**:
```javascript
// Parent task
{ id: 'p1', text: 'Parent', list: 'today', parentId: null }

// Child task (same list as parent)
{ id: 'c1', text: 'Child', list: 'today', parentId: 'p1' }
```

**Critical**: When moving parent, ALL children must move atomically.

## Design Patterns

### Configuration-Driven
All magic numbers in `scripts/config.js`:
```javascript
Config.MAX_TASK_LENGTH = 200;
Config.SAVE_DEBOUNCE_MS = 100;
Config.RENDER_DEBOUNCE_MS = 16;
Config.LONG_PRESS_DURATION = 600;  // ms
Config.SWIPE_THRESHOLD = 50;        // px
```

### Single Responsibility
Each module has ONE job:
- `storage.js`: LocalStorage CRUD only
- `task-manager.js`: Business logic only
- `renderer.js`: DOM manipulation only
- `interaction-manager.js`: Event handling only

### Escape User Input
Always escape HTML to prevent XSS:
```javascript
// utils.js
escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

## Component Relationships

### App.js (Orchestrator)
Central coordination point that owns:
- `this.data` (application state)
- `this.saveQueue` (pending save operations)
- `save()` and `render()` methods

All other modules receive `app` reference and delegate through it.

### TaskManager (Business Logic)
Handles:
- Task CRUD operations
- Parent-child relationships
- Task movement between lists
- Subtask operations
- Completion cascades

**Does NOT**: Touch DOM or LocalStorage directly

### Renderer (View Layer)
Handles:
- DOM generation from data
- Visual state updates
- Animation classes
- Theme application

**Does NOT**: Modify data directly (calls app.save())

### InteractionManager (Controller)
Handles:
- Click/touch events
- Drag/swipe gestures
- Long press detection
- Context menus

**Does NOT**: Contain business logic (delegates to TaskManager)

## Critical Implementation Paths

### Task Creation Flow
```
User types in input
  ↓
InteractionManager.handleKeyPress (Enter)
  ↓
TaskManager.addTask(text, list)
  ↓
app.data[list].push(newTask)
  ↓
app.save() → queues save (100ms debounce)
  ↓
app.render() → updates DOM (16ms debounce)
```

### Parent Task Movement (Critical!)
```
User clicks move button
  ↓
InteractionManager.handleMoveClick
  ↓
TaskManager.moveTaskToList(id, toList)
  ↓
Collect all tasks to move (parent + children)
  ↓
Remove all from source in ONE filter
  ↓
Add all to target in ONE pass
  ↓
app.save() + app.render()
```

**Why Critical**: Must be atomic or children can be orphaned.

### Save Queue Processing
```
app.save() called
  ↓
Push timestamp to saveQueue
  ↓
If not already saving → processSaveQueue()
  ↓
Wait SAVE_DEBOUNCE_MS (100ms)
  ↓
Atomically clear queue with splice(0)
  ↓
Storage.save(this.data)
  ↓
If new items queued → recurse
```

## Testing Patterns

### E2E Test Structure
```
tests/e2e/
├── basic-tasks.spec.js        (11 tests - CRUD)
├── subtasks.spec.js           (11 tests - parent-child)
├── deadline.spec.js           (11 tests - deadline picker)
├── pomodoro.spec.js           (8 tests - timer)
├── import-export.spec.js      (13 tests - data portability)
├── gestures.spec.js           (4 tests - mobile touch)
├── complex-flows.spec.js      (30 tests - edge cases)
├── mobile-edge-cases.spec.js  (26 tests - mobile edge cases)
└── race-conditions.spec.js    (27 tests - timing edge cases)
```

### Page Object Model
Test fixtures in `tests/e2e/fixtures/app-page.js`:
- `addTask(text, list)` - Add task helper
- `addSubtask(parentText, subtaskText)` - Subtask creation
- `clickMoveButton(text)` - Move task helper
- `waitForSaveComplete()` - Timing helper

**Important**: Helpers must account for save debounce (100ms) and animations.

## Concurrency Coordination Layer

### The P⁴ Meta-Pattern Discovery (v1.22.0)
All 36 bugs stemmed from missing concurrency coordination in debounced architecture:

**Problem**: Debounced save (100ms) + rapid user operations → race conditions
**Solution**: Atomic save queue + batch operations + operation tracking

**Core Principles**:
1. **Atomicity**: Use `splice(0)`, single-pass filters
2. **Batching**: Collect all changes before applying
3. **Recursion**: Process new queue items after completion
4. **Tracking**: Log operation counts for debugging

This architectural fix eliminated 21 bugs in one wave.
