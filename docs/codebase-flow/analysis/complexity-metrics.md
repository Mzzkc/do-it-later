# Complexity Metrics

## Overview

This document analyzes the codebase complexity using various metrics to identify areas of high complexity, potential refactoring opportunities, and code quality insights.

## Module Statistics

| Module | Lines of Code | Functions/Methods | Cyclomatic Complexity | Maintainability |
|--------|--------------|-------------------|----------------------|-----------------|
| app.js | ~700 | 45+ | High | Moderate |
| task-manager.js | ~550 | 25+ | Medium | Good |
| renderer.js | ~500 | 15+ | Medium | Good |
| qr-handler.js | ~450 | 12+ | Medium | Good |
| import-export-manager.js | ~350 | 10+ | Low-Medium | Good |
| interaction-manager.js | ~450 | 12+ | Medium | Good |
| pomodoro.js | ~200 | 8 | Low | Excellent |
| deadline-picker.js | ~150 | 6 | Low | Excellent |
| sync.js | ~250 | 4 | Medium | Good |
| qr-scanner.js | ~175 | 6 | Low | Good |
| dev-mode.js | ~280 | 8 | Low | Good |
| storage.js | ~110 | 5 | Low | Excellent |
| utils.js | ~175 | 14 | Low | Excellent |
| config.js | ~180 | 0 | N/A | Excellent |

**Total Lines of Code:** ~4,500 (excluding external libraries)
**Total Functions:** ~153
**Average Functions per Module:** ~11

## Cyclomatic Complexity Analysis

### High Complexity Functions (> 15 branches)

#### 1. `app.checkDateRollover()`
**Complexity:** 20+
**Reason:** Multiple conditional checks for:
- Date comparison
- Task age calculation
- Deadline processing
- Importance marking
- Notification building

**Recommendation:** Consider breaking into smaller functions:
- `cleanupCompletedTasks()`
- `processDeadlines()`
- `buildRolloverNotification()`

#### 2. `renderer.createTaskElement()`
**Complexity:** 15+
**Reason:** Handles all task rendering scenarios:
- Checkbox creation
- Text formatting
- Button creation
- Subtask recursion
- Delete mode
- Deadline display

**Recommendation:** Already well-structured with helper methods. Could extract subtask rendering.

#### 3. `app.setupSwipeGestures()`
**Complexity:** 18+
**Reason:** Touch event handling with:
- Position tracking
- Movement calculation
- Threshold detection
- Animation triggering
- Direction determination

**Recommendation:** Extract into dedicated SwipeManager class.

### Medium Complexity Functions (8-15 branches)

- `taskManager.addTask()` - 10 branches
- `importExportManager.importFromFile()` - 12 branches
- `qrHandler.generateQRCode()` - 10 branches
- `app.bindEvents()` - 14 branches
- `sync.decompress()` - 12 branches

### Low Complexity Functions (< 8 branches)

Most utility functions, simple getters/setters, and focused methods fall into this category.

## Function Length Analysis

### Very Long Functions (> 100 lines)

#### `app.checkDateRollover()` - ~120 lines
- **Issue:** Handles too many responsibilities
- **Impact:** Difficult to test individual behaviors
- **Recommendation:** Split into smaller, focused functions

#### `qrHandler.showModal()` - ~150 lines
- **Issue:** Combines DOM creation, event handling, and business logic
- **Impact:** Hard to modify UI without affecting logic
- **Recommendation:** Extract DOM building and event setup

#### `renderer.createTaskElement()` - ~100 lines
- **Issue:** Complex recursive rendering
- **Impact:** Acceptable given task complexity
- **Recommendation:** No immediate action needed

### Long Functions (50-100 lines)

- `app.setupSwipeGestures()` - ~80 lines
- `app.init()` - ~60 lines
- `importExportManager.importFromFile()` - ~70 lines
- `sync.compress()` - ~65 lines

**Pattern:** Setup and initialization functions tend to be longer, which is acceptable for orchestration code.

### Ideal Functions (< 50 lines)

~80% of functions fall into this category, indicating generally good function decomposition.

## Nesting Depth Analysis

### Deep Nesting (> 4 levels)

#### Location: `app.checkDateRollover()`
```javascript
if (dateChanged) {
  completedTasks.forEach(task => {
    if (taskAge > threshold) {
      if (task.list === 'today') {
        if (task.completed) {
          // 5 levels deep
        }
      }
    }
  });
}
```

**Recommendation:** Use early returns and extract to separate functions.

#### Location: `renderer.createTaskElement()`
```javascript
if (hasSubtasks) {
  subtasks.forEach(subtask => {
    if (!subtask.completed) {
      if (deleteMode) {
        // 4 levels deep
      }
    }
  });
}
```

**Recommendation:** Extract subtask rendering logic.

### Typical Nesting (2-3 levels)

Most of the codebase maintains reasonable nesting depth.

## Code Duplication Analysis

### Identified Duplications

#### 1. Event Handler Pattern
**Occurrences:** 20+ locations in app.js

```javascript
element.addEventListener('click', (e) => {
  e.preventDefault();
  // handler logic
});
```

**Recommendation:** Not worth extracting - clear and simple pattern.

#### 2. Find Task By ID
**Occurrences:** Used in ~10 methods

```javascript
const task = this.app.data.tasks.find(t => t.id === id);
if (!task) return false;
```

**Status:** Already extracted to `taskManager.findTaskById()` ✓

#### 3. Save and Render Pattern
**Occurrences:** After every data modification

```javascript
this.app.saveData();
this.app.render();
```

**Recommendation:** Consider "auto-save" decorator pattern or observer.

### Acceptable Repetition

- DOM element creation patterns
- Error handling try/catch blocks
- Null/undefined checks
- Console logging patterns

## Dependency Complexity

### Module Dependencies

```
Config: 0 dependencies
Utils: 1 dependency (Config)
Storage: 2 dependencies (Config, Utils)
TaskManager: 3 dependencies (Config, Utils, app)
Renderer: 3 dependencies (Config, Utils, app)
App: 10+ dependencies (all modules)
```

**Observation:** Clear dependency hierarchy with no circular dependencies.

### Coupling Analysis

#### Tight Coupling (Potentially Problematic)

**App ↔ All Modules**
- App creates all modules
- Modules reference app.data
- **Risk:** Changes to app.data affect all modules
- **Mitigation:** Well-defined interface (data structure)

#### Loose Coupling (Good)

- Storage ↔ Utils (only for JSON operations)
- Renderer ↔ Config (only for constants)
- TaskManager ↔ Utils (only for utilities)

### Cohesion Analysis

**High Cohesion (Good):**
- `utils.js` - All utility functions
- `storage.js` - All persistence logic
- `config.js` - All constants
- `task-manager.js` - All task operations

**Medium Cohesion (Acceptable):**
- `app.js` - Orchestration and coordination
- `renderer.js` - All rendering logic

**Areas to Watch:**
- `app.js` growing too large with features

## Performance Complexity

### Time Complexity

#### Linear Operations O(n)

Most operations scale linearly with task count:
- `taskManager.getTasksByList()` - Filters array
- `renderer.render()` - Iterates all tasks
- `taskManager.findTaskById()` - Array.find()

**Impact:** Negligible for < 1000 tasks

#### Quadratic Operations O(n²)

**None identified** - Good sign!

### Space Complexity

#### Memory Usage

**Per Task:** ~200-500 bytes
- id: ~15 bytes
- text: ~50-200 bytes (max 200 chars)
- properties: ~100 bytes
- subtasks: recursive

**Estimated Maximum:**
- 1000 tasks × 500 bytes = 500KB
- Well within localStorage limits (5-10MB)

#### DOM Complexity

**Per Task:** 3-5 DOM nodes
- `<li>` container
- checkbox input
- text span
- 1-2 buttons

**Estimated Maximum:**
- 1000 tasks × 5 nodes = 5000 DOM nodes
- Acceptable for modern browsers

## Technical Debt Analysis

### High Priority

1. **App.js growing too large**
   - Current: ~700 lines
   - Recommendation: Extract swipe handling, mobile navigation

2. **checkDateRollover complexity**
   - Current: 20+ branches, 120 lines
   - Recommendation: Split into focused functions

3. **No automated testing**
   - Impact: Refactoring is risky
   - Recommendation: Add unit tests for critical paths

### Medium Priority

1. **Manual save/render calling**
   - Pattern: Every mutation calls saveData() and render()
   - Recommendation: Consider observer pattern or Proxy-based reactivity

2. **Event listener cleanup**
   - Some listeners not removed
   - Recommendation: Implement cleanup in module destroy methods

3. **Error handling consistency**
   - Some functions return boolean, others throw
   - Recommendation: Standardize error handling approach

### Low Priority

1. **Utils.js could be split**
   - Mix of DOM, data, and utility functions
   - Recommendation: Create separate DomUtils, DateUtils, etc.

2. **Magic numbers in code**
   - Some timing values hardcoded
   - Recommendation: Move to Config (mostly done)

## Maintainability Index

Using a simplified maintainability index (0-100 scale):

| Module | Score | Assessment |
|--------|-------|------------|
| config.js | 95 | Excellent |
| utils.js | 90 | Excellent |
| storage.js | 92 | Excellent |
| task-manager.js | 85 | Good |
| renderer.js | 82 | Good |
| app.js | 72 | Moderate |
| import-export-manager.js | 85 | Good |
| Other modules | 85-90 | Good-Excellent |

**Overall Assessment:** Codebase is maintainable with clear areas for improvement.

## Code Quality Metrics Summary

| Metric | Score | Target | Status |
|--------|-------|--------|--------|
| Average Function Length | 25 lines | < 30 | ✓ Good |
| Max Function Length | 150 lines | < 100 | ⚠ Warning |
| Functions > 50 lines | 15% | < 20% | ✓ Good |
| Average Nesting Depth | 2.5 | < 3 | ✓ Good |
| Max Nesting Depth | 5 | < 4 | ⚠ Warning |
| Cyclomatic Complexity Avg | 8 | < 10 | ✓ Good |
| Cyclomatic Complexity Max | 20 | < 15 | ⚠ Warning |
| Code Duplication | < 5% | < 10% | ✓ Good |
| Module Cohesion | High | High | ✓ Good |
| Coupling Level | Medium | Low-Medium | ✓ Acceptable |

## Recommendations Priority

### Immediate (High Impact, Low Effort)

1. Extract `checkDateRollover` sub-functions
2. Add JSDoc to complex functions
3. Document edge cases in comments

### Short-term (High Impact, Medium Effort)

1. Extract SwipeManager from app.js
2. Add error boundary handling
3. Implement module cleanup methods

### Long-term (Medium Impact, High Effort)

1. Add automated testing framework
2. Implement observer pattern for state changes
3. Create developer documentation for patterns

## Conclusion

The codebase shows **good overall quality** with:
- Clear module boundaries
- Minimal duplication
- Reasonable function sizes
- No circular dependencies

**Key areas for improvement:**
- Reduce complexity in checkDateRollover
- Extract gesture handling
- Add automated testing