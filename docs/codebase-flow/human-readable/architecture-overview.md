# Architecture Overview

## Introduction

Do It (Later) is a vanilla JavaScript Progressive Web App (PWA) for task management. The architecture follows a **modular, layered approach** with clear separation of concerns and no external framework dependencies.

## Design Philosophy

### Core Principles

1. **Simplicity First** - No build tools, no bundlers, just vanilla JavaScript
2. **Progressive Enhancement** - Works offline, installable as PWA
3. **Mobile-First** - Touch gestures, responsive design
4. **Zero Dependencies** - Except for QR code libraries
5. **LocalStorage Persistence** - All data stored client-side
6. **Debounced Operations** - Optimized for performance

### Why This Architecture?

The codebase deliberately avoids frameworks to:
- Minimize bundle size and load times
- Eliminate dependency management complexity
- Provide direct control over performance
- Ensure long-term maintainability
- Enable easy understanding for contributors

## Architectural Layers

### Layer 0: Configuration
**Modules:** `config.js`

The foundation of the application. Config provides:
- **Constants** - All magic numbers centralized
- **DOM Selectors** - Centralized element references
- **CSS Classes** - Class name constants
- **Timing Values** - Debounce delays, animation durations
- **Theme Settings** - Light/dark theme configuration

**Why it matters:** Changing a constant in Config affects the entire app. No hardcoded values scattered throughout the codebase.

### Layer 1: Utilities
**Modules:** `utils.js`

Shared functionality used across the application:
- **ID Generation** - Unique task identifiers
- **HTML Escaping** - XSS protection
- **Date Formatting** - Human-readable dates
- **Debouncing** - Performance optimization
- **JSON Operations** - Safe parse/stringify with error handling

**Pattern:** All utilities are pure functions with no side effects.

### Layer 2: Core Services
**Modules:** `storage.js`, `sync.js`

Data persistence and synchronization:

**Storage** handles:
- Loading data from localStorage
- Saving data to localStorage
- Data migration between versions
- Default data structure creation

**Sync** handles:
- Compressing tasks for export
- Decompressing imported data
- Format conversion (internal ↔ export)

**Key Insight:** Storage is the single source of truth for persistence. All data flows through Storage.load() and Storage.save().

### Layer 3: Data Management
**Modules:** `task-manager.js`

The business logic layer:
- **CRUD Operations** - Create, Read, Update, Delete tasks
- **Task Movement** - Between today/tomorrow lists
- **Subtask Management** - Parent-child relationships
- **Deadline Handling** - Date-based task management
- **Sorting & Filtering** - Task organization

**Pattern:** TaskManager is instantiated by the App and holds a reference back to it. This enables TaskManager to access app.data while keeping data manipulation logic separate.

### Layer 4: UI Components
**Modules:** `renderer.js`, `interaction-manager.js`, `deadline-picker.js`, `pomodoro.js`

Presentation and interaction:

**Renderer** - Pure presentation logic:
- Creates DOM elements for tasks
- Applies visual styles and animations
- Handles importance gradients
- Updates mobile view states

**InteractionManager** - Touch/mouse handling:
- Long press detection
- Swipe gesture recognition
- Movement tolerance
- Visual feedback during interaction

**DeadlinePicker** - Date selection UI
**PomodoroTimer** - Focus timer feature

**Philosophy:** UI components don't modify data directly. They call app methods which delegate to TaskManager.

### Layer 5: Features
**Modules:** `import-export-manager.js`, `qr-handler.js`, `qr-scanner.js`, `dev-mode.js`

Higher-level features built on core layers:

**ImportExportManager:**
- Orchestrates file/clipboard/QR import/export
- Uses Sync for data transformation
- Handles merge logic for imported tasks

**QRHandler:**
- Generates QR codes from task data
- Displays QR modal
- Uses Sync for data compression

**QRScanner:**
- Camera access and video stream
- QR code detection using jsQR library
- Decodes task data

**DevMode:**
- Developer logging system
- Performance monitoring
- Debug information display

### Layer 6: Application
**Modules:** `app.js`

The orchestrator that ties everything together:

```javascript
class DoItTomorrowApp {
  constructor() {
    this.data = Storage.load();           // Load persisted data
    this.taskManager = new TaskManager(this);
    this.renderer = new Renderer(this);
    // ... initialize all modules
    this.init();                          // Start the app
  }
}
```

**Responsibilities:**
- Module instantiation and coordination
- Event binding (keyboard, mouse, touch)
- State management (app.data holds all state)
- Debounced save/render orchestration
- Date rollover logic
- Notification system

## Data Flow Architecture

### Unidirectional Data Flow

```
User Input → Event Handler → TaskManager → app.data → Storage → Renderer → DOM
```

1. **User Action** - Click, type, swipe
2. **Event Handler** - App method (addTask, toggleTask, etc.)
3. **Data Update** - TaskManager modifies app.data
4. **Persistence** - Debounced Storage.save()
5. **UI Update** - Debounced Renderer.render()

**Critical Insight:** The app.data object is the single source of truth. All UI updates are triggered by data changes, never the reverse.

### State Management

```javascript
this.data = {
  tasks: [...],           // All tasks in single array
  lastUpdated: 1234567890,
  currentDate: "2024-01-01",
  totalCompleted: 42,
  version: 2
}
```

**State mutations only happen through:**
- TaskManager methods
- Import operations
- Date rollover logic

**The Renderer is read-only** - It never modifies data, only displays it.

## Event-Driven Architecture

### Event Flow

1. **DOM Events** → Browser captures user interaction
2. **Event Listeners** → Bound in app.bindEvents()
3. **Event Handlers** → App methods process events
4. **State Changes** → Data updated
5. **Side Effects** → Save and render triggered

### Debouncing Strategy

**Two debounced operations:**

```javascript
saveData() {
  // Debounce 100ms - Wait for rapid changes to settle
  clearTimeout(this.saveTimeout);
  this.saveTimeout = setTimeout(() => {
    Storage.save(this.data);
  }, Config.SAVE_DEBOUNCE_MS);
}

render() {
  // Debounce 16ms (~60fps) - Optimize animation frame
  clearTimeout(this.renderTimeout);
  this.renderTimeout = setTimeout(() => {
    this.renderer.render();
  }, Config.RENDER_DEBOUNCE_MS);
}
```

**Why this matters:** During rapid typing, we don't save on every keystroke or render on every character. This dramatically improves performance.

## Module Communication Patterns

### Composition Over Inheritance

No class hierarchies. Instead, modules are composed:

```javascript
class DoItTomorrowApp {
  constructor() {
    this.taskManager = new TaskManager(this);  // Pass 'this' reference
    this.renderer = new Renderer(this);
  }
}
```

Each module receives the app instance and can access:
- `this.app.data` - Current state
- `this.app.saveData()` - Trigger persistence
- `this.app.render()` - Trigger UI update

### Dependency Injection

Modules don't create their dependencies; they receive them:

```javascript
class TaskManager {
  constructor(app) {
    this.app = app;  // App injected, not created
  }
}
```

This enables:
- Easy testing
- Clear dependencies
- Loose coupling

## Performance Optimizations

### 1. Minimal DOM Manipulation

Renderer clears and rebuilds lists only when needed. Individual task updates use targeted DOM operations.

### 2. CSS Animations

All animations use CSS classes, not JavaScript animation loops. GPU-accelerated transforms for smooth 60fps.

### 3. Event Delegation

Event listeners on list containers, not individual tasks. Scales to hundreds of tasks without listener overhead.

### 4. Debouncing

Save and render operations debounced to reduce unnecessary work during rapid user input.

### 5. No Virtual DOM

Direct DOM manipulation is fast for this app size. No need for virtual DOM overhead.

## Security Considerations

### XSS Prevention

All user input escaped:

```javascript
Utils.escapeHtml(text);  // Prevents script injection
```

Used everywhere user text is displayed.

### No Remote Code Execution

- No `eval()` usage
- No dynamic script loading
- No innerHTML with user content (textContent used instead)

### LocalStorage Only

No server communication means no CSRF, no authentication vulnerabilities, no data leaks.

## Progressive Web App Features

### Service Worker

Caches all static assets for offline functionality. Registered in `app.registerServiceWorker()`.

### Manifest

`manifest.json` enables installation as standalone app on mobile devices.

### Responsive Design

Mobile-first with touch gestures:
- Swipe to move tasks
- Long press for context menu
- Mobile navigation tabs

## Extensibility Points

### Adding New Features

1. **Create Module** - New class in `scripts/`
2. **Add to HTML** - Include in load order
3. **Instantiate in App** - `this.newModule = new NewModule(this)`
4. **Access State** - Use `this.app.data`
5. **Trigger Updates** - Call `this.app.saveData()` and `this.app.render()`

### Modifying Data Structure

1. **Update Config** - Add new constants if needed
2. **Modify Storage.getDefaultData()** - New default structure
3. **Create Migration** - In Storage.migrateData()
4. **Increment Version** - Update version number
5. **Update TaskManager** - Handle new properties

### Adding UI Components

1. **Create Renderer Method** - Build DOM element
2. **Add Event Listeners** - In app.bindEvents()
3. **Update CSS** - Add styles in stylesheets
4. **Use Config Constants** - For selectors and classes

## Conclusion

This architecture prioritizes:
- **Clarity** - Easy to understand where things are
- **Maintainability** - Changes are localized
- **Performance** - Optimized for the common case
- **Reliability** - Minimal external dependencies

The modular, layered approach means new developers can quickly find what they need to change without understanding the entire codebase.