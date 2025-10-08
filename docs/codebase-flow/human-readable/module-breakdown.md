# Module Breakdown

## Complete Module Reference

This document provides detailed information about each module, including purpose, key methods, dependencies, and when to modify.

---

## config.js

**Purpose:** Single source of truth for all application constants

**Type:** Frozen singleton object

**Exports:** `Config`

**Dependencies:** None

**Key Constants:**
- `VERSION` - Current app version
- `STORAGE_KEY` - localStorage key name
- `SAVE_DEBOUNCE_MS` - Save delay (100ms)
- `RENDER_DEBOUNCE_MS` - Render delay (16ms)
- `SELECTORS` - All DOM selector strings
- `CLASSES` - All CSS class names
- `NOTIFICATION_TYPES` - Success, error, warning, info

**When to Modify:**
- Adding new timing constants
- Changing UI constraints
- Adding new CSS classes used in JS
- Updating DOM selectors
- Changing default theme or colors

**Best Practices:**
- Never hardcode values that appear in Config
- Add constants, don't modify existing ones (breaking changes)
- Keep related constants grouped
- Use Object.freeze() to prevent accidental modifications

---

## utils.js

**Purpose:** Shared utility functions used across all modules

**Type:** Frozen singleton object with methods

**Exports:** `Utils`

**Dependencies:** `Config`

**Key Methods:**

### `generateId()`
Returns unique ID using timestamp + random string
```javascript
const id = Utils.generateId();
// Returns: "l8x9k2a1b3c4d"
```

### `escapeHtml(text)`
Prevents XSS attacks by escaping HTML
```javascript
const safe = Utils.escapeHtml(userInput);
// "<script>" becomes "&lt;script&gt;"
```

### `formatDate(date, options)`
Human-readable date formatting
```javascript
const formatted = Utils.formatDate(new Date());
// Returns: "Monday, January 1, 2024"
```

### `debounce(func, wait)`
Creates debounced version of function
```javascript
const debouncedSave = Utils.debounce(saveFunc, 100);
```

**When to Modify:**
- Adding new shared utilities needed by multiple modules
- Enhancing existing utilities (with backward compatibility)
- Never for module-specific logic (goes in that module)

**Best Practices:**
- Keep functions pure (no side effects)
- Add comprehensive JSDoc comments
- Include error handling
- Test edge cases

---

## storage.js

**Purpose:** LocalStorage operations with error handling and data migration

**Type:** Frozen singleton object with methods

**Exports:** `Storage`

**Dependencies:** `Config`, `Utils`

**Key Methods:**

### `load()`
Loads data from localStorage
```javascript
const data = Storage.load();
// Returns app data or default structure
```
- Handles missing data (returns defaults)
- Triggers migration if old version detected
- Graceful error handling

### `save(data)`
Saves data to localStorage
```javascript
const success = Storage.save(appData);
// Returns true/false
```
- JSON stringifies data
- Catches quota exceeded errors
- Returns success boolean

### `getDefaultData()`
Returns default data structure
```javascript
const defaults = Storage.getDefaultData();
// Returns: { tasks: [], lastUpdated: ..., version: 2 }
```

### `migrateData(oldData)`
Migrates v1 (today/tomorrow arrays) to v2 (unified tasks array)
```javascript
const newData = Storage.migrateData(oldFormat);
```

**When to Modify:**
- Changing data structure (requires migration logic)
- Adding new default properties
- Updating storage key (breaking change!)
- Enhancing error handling

**Migration Pattern:**
1. Increment version number
2. Add migration logic in `migrateData()`
3. Update `getDefaultData()` with new structure
4. Test with old data

---

## sync.js

**Purpose:** Data compression/decompression for import/export

**Type:** Singleton object with methods

**Exports:** `Sync`

**Dependencies:** `Utils`

**Key Methods:**

### `compress(data)`
Converts app data to compact string format
```javascript
const compressed = Sync.compress(appData);
// Returns: "T:!Task1|Task2~L:Task3|!Task4~C:42"
```

**Format:**
- `T:` - Today tasks
- `L:` - Later tasks
- `!` - Important task prefix
- `|` - Task delimiter
- `~` - Section delimiter
- `C:` - Completed count

### `decompress(string)`
Converts compressed string back to app data
```javascript
const data = Sync.decompress(compressedString);
// Returns: { tasks: [...], totalCompleted: 42 }
```

**When to Modify:**
- Changing export format (add version prefix!)
- Adding new task properties to export
- Optimizing compression ratio
- Supporting new import sources

**Best Practices:**
- Maintain backward compatibility with old formats
- Add version identifiers for format changes
- Validate input before decompression
- Handle malformed data gracefully

---

## task-manager.js

**Purpose:** All task-related business logic and CRUD operations

**Type:** Class (instantiated by App)

**Exports:** `TaskManager`

**Dependencies:** `Utils`, `app` (via constructor injection)

**Constructor:**
```javascript
constructor(app) {
  this.app = app;  // Reference to main app
}
```

**Key Methods:**

### CRUD Operations

#### `addTask(text, listName)`
Creates new task
```javascript
taskManager.addTask("Buy milk", "today");
```
- Generates unique ID
- Escapes HTML
- Adds to app.data.tasks
- Returns task ID

#### `toggleTask(id)`
Toggles completion status
```javascript
taskManager.toggleTask("abc123");
```
- Finds task by ID
- Flips `completed` boolean
- Returns success boolean

#### `deleteTask(id)`
Removes task
```javascript
taskManager.deleteTask("abc123");
```
- Removes from tasks array
- Also removes all subtasks
- Returns success boolean

#### `editTask(id, newText)`
Updates task text
```javascript
taskManager.editTask("abc123", "New text");
```
- Finds task
- Escapes HTML
- Updates text property
- Returns success boolean

### List Operations

#### `moveTaskToList(id, toList)`
Moves task between lists
```javascript
taskManager.moveTaskToList("abc123", "tomorrow");
```
- Changes `list` property
- Preserves all other data
- Returns success boolean

#### `getTasksByList(listName)`
Filters tasks by list
```javascript
const todayTasks = taskManager.getTasksByList("today");
```
- Returns array of tasks
- Excludes completed tasks (optional)
- Sorted by importance then creation

### Subtask Operations

#### `addSubtask(parentId, text)`
Adds subtask to parent
```javascript
taskManager.addSubtask("parent123", "Subtask text");
```
- Creates new task with `parentId`
- Adds to parent's subtasks array
- Inherits parent's list
- Returns subtask ID

### Additional Operations

#### `toggleImportance(id)`
Marks task as important
```javascript
taskManager.toggleImportance("abc123");
```

#### `setDeadline(id, date)`
Sets task deadline
```javascript
taskManager.setDeadline("abc123", "2024-01-15");
```

#### `sortTasks(tasks)`
Sorts by importance then creation
```javascript
const sorted = taskManager.sortTasks(taskArray);
```

**When to Modify:**
- Adding new task properties
- Implementing new task operations
- Changing sort/filter logic
- Adding validation rules

**Best Practices:**
- Always use `findTaskById()` to locate tasks
- Escape HTML for all user input
- Return success booleans for operations
- Don't trigger saves/renders (App does that)

---

## renderer.js

**Purpose:** Pure presentation logic - converts data to DOM

**Type:** Class (instantiated by App)

**Exports:** `Renderer`

**Dependencies:** `Config`, `Utils`, `app`

**Key Methods:**

### `render()`
Main render function - updates all lists
```javascript
renderer.render();
```
- Gets tasks from TaskManager
- Clears existing lists
- Creates elements for each task
- Applies CSS animations
- Updates mobile view

### `createTaskElement(task, index)`
Creates DOM element for single task
```javascript
const li = renderer.createTaskElement(task, 0);
```
- Creates `<li>` with classes
- Adds checkbox
- Adds task text
- Adds action buttons
- Recursively renders subtasks
- Returns element

### `createCheckbox(task)`
Creates checkbox element
```javascript
const checkbox = renderer.createCheckbox(task);
```
- Checked if task.completed
- Data attribute for task ID
- Event listener for toggle

### `createMoveButton(task)`
Creates move button with arrow
```javascript
const btn = renderer.createMoveButton(task);
```
- Arrow points to destination list
- Data attributes for task ID and direction
- Click handler for movement

### `handleImportanceGradient()`
Applies visual gradient to important tasks
```javascript
renderer.handleImportanceGradient();
```
- Adds CSS classes
- Creates visual hierarchy
- Top 3 tasks get gradient effect

### `updateMobileView()`
Manages mobile navigation state
```javascript
renderer.updateMobileView();
```
- Shows/hides lists based on current view
- Updates nav button states

**When to Modify:**
- Changing task display format
- Adding new visual elements
- Updating animations
- Modifying mobile layouts

**Best Practices:**
- Never modify app.data (read-only)
- Use Config constants for classes/selectors
- Escape HTML with Utils.escapeHtml()
- Keep presentation logic separate from business logic
- Use event delegation for performance

---

## interaction-manager.js

**Purpose:** Touch and mouse interaction detection

**Type:** Class (LongPressManager)

**Exports:** `LongPressManager`

**Dependencies:** `Config`

**Constructor:**
```javascript
constructor(options) {
  this.timeout = options.timeout || 600;
  this.tolerance = options.tolerance || 10;
  this.onLongPress = options.onLongPress;
  this.onCancel = options.onCancel;
}
```

**Key Methods:**

### `start(element, event)`
Begin long press detection
```javascript
longPressManager.start(taskElement, touchEvent);
```
- Records start position
- Sets 600ms timer
- Monitors movement
- Adds visual feedback class

### `cancel(reason)`
Cancel ongoing detection
```javascript
longPressManager.cancel("moved too much");
```
- Clears timer
- Removes visual feedback
- Calls onCancel callback

### `triggerLongPress()`
Fire long press event
```javascript
// Called automatically after 600ms
```
- Executes onLongPress callback
- Cleans up state
- Shows context menu

**When to Modify:**
- Adjusting timing thresholds
- Changing movement tolerance
- Adding new gesture types
- Supporting different input methods

**Best Practices:**
- Use Config constants for timing
- Clean up timers properly
- Provide visual feedback
- Handle both touch and mouse events

---

## import-export-manager.js

**Purpose:** Orchestrates import/export operations

**Type:** Class (instantiated by App)

**Exports:** `ImportExportManager`

**Dependencies:** `Config`, `Utils`, `Sync`, `app`

**Key Methods:**

### `setup()`
Initializes UI and event listeners
```javascript
importExportManager.setup();
```
- Binds buttons to handlers
- Sets up file input
- Prepares clipboard API

### `exportToFile()`
Downloads tasks as .txt file
```javascript
importExportManager.exportToFile();
```
- Compresses data with Sync
- Creates Blob
- Triggers download

### `exportToClipboard()`
Copies tasks to clipboard
```javascript
importExportManager.exportToClipboard();
```
- Compresses data
- Uses Clipboard API
- Shows success notification

### `importFromFile(file)`
Reads and imports file
```javascript
importExportManager.importFromFile(fileObject);
```
- Reads file with FileReader
- Decompresses data
- Merges with existing tasks

### `importFromClipboard()`
Imports from clipboard
```javascript
importExportManager.importFromClipboard();
```
- Reads clipboard
- Decompresses
- Merges tasks

### `mergeTasks(importedData)`
Combines imported with existing
```javascript
importExportManager.mergeTasks(newData);
```
- Avoids duplicates
- Preserves existing tasks
- Returns merged result

**When to Modify:**
- Adding new import sources
- Changing merge strategy
- Supporting new file formats
- Enhancing error handling

---

## Other Modules

### pomodoro.js
**Purpose:** Pomodoro timer feature
**Key Methods:** `start()`, `pause()`, `reset()`, `tick()`

### deadline-picker.js
**Purpose:** Date picker for deadlines
**Key Methods:** `show()`, `hide()`, `setDeadline()`

### qr-handler.js
**Purpose:** QR code generation
**Key Methods:** `generateQRCode()`, `showModal()`

### qr-scanner.js
**Purpose:** QR code scanning
**Key Methods:** `start()`, `stop()`, `decode()`

### dev-mode.js
**Purpose:** Developer tools and logging
**Key Methods:** `activate()`, `log()`, `showLogs()`

---

## app.js - Main Application

**Purpose:** Orchestrates all modules and handles app lifecycle

**Type:** Class (single instance created on page load)

**Exports:** `DoItTomorrowApp`

**Constructor Flow:**
```javascript
constructor() {
  this.data = Storage.load();          // 1. Load data
  this.taskManager = new TaskManager(this);  // 2. Create modules
  this.renderer = new Renderer(this);
  // ... other modules
  this.init();                         // 3. Initialize
}
```

**Key Methods:**

### Application Lifecycle

#### `init()`
Initializes the application
- Sets up theme
- Checks date rollover
- Binds events
- Renders UI
- Registers service worker

### User Actions

#### `addTask(text, listName)`
Handles task creation
```javascript
app.addTask("New task", "today");
```
- Delegates to TaskManager
- Triggers save and render

#### `toggleTask(id)`
Handles task completion toggle

#### `moveTask(id, direction)`
Handles task list movement

#### `deleteTask(id)`
Handles task deletion

### State Management

#### `saveData()`
Debounced save to localStorage
```javascript
app.saveData();  // Saves after 100ms delay
```

#### `render()`
Debounced UI update
```javascript
app.render();  // Renders after 16ms delay
```

### Special Features

#### `checkDateRollover()`
Daily maintenance on date change
- Removes old completed tasks
- Moves deadline tasks
- Updates importance
- Shows notification

#### `showNotification(message, type)`
Displays toast notification
```javascript
app.showNotification("Task added!", "success");
```

**When to Modify:**
- Adding new event listeners
- Implementing new features
- Changing initialization flow
- Adding global handlers