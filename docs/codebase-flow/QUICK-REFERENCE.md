# Quick Reference Guide

## One-Page Overview for Fast Lookups

---

## Module Dependencies (Load Order)

```
1. config.js       → No dependencies
2. utils.js        → Config
3. storage.js      → Config, Utils
4. sync.js         → Utils
5. qrcode.min.js   → External library
6. jsQR (CDN)      → External library
7. qr-scanner.js   → Config, jsQR
8. pomodoro.js     → Config, Utils
9. deadline-picker.js → Config
10. dev-mode.js    → Config, Utils
11. qr-handler.js  → Config, Utils, QRCode
12. renderer.js    → Config, Utils
13. task-manager.js → Utils
14. interaction-manager.js → Config
15. import-export-manager.js → Config, Utils, Sync
16. app.js         → All above modules
```

---

## Task Data Structure

```javascript
{
  id: "l8x9k2a...",           // Utils.generateId()
  text: "Task description",   // Max 200 chars, HTML escaped
  list: "today" | "tomorrow", // Which list
  completed: false,           // Completion status
  important: false,           // Importance flag
  subtasks: [],               // Array of child tasks
  deadline: "2024-01-15",     // ISO date or null
  parentId: null              // Parent task ID or null
}
```

---

## App Data Structure

```javascript
{
  tasks: [],              // All tasks in single array
  lastUpdated: 1234567890,  // Timestamp
  currentDate: "2024-01-01", // YYYY-MM-DD
  totalCompleted: 42,     // Lifetime counter
  version: 2              // Data format version
}
```

---

## Common Operations

### Add Task
```javascript
// User presses Enter in input
app.addTask(text, listName)
  → taskManager.addTask(text, listName)
  → data.tasks.push(newTask)
  → app.saveData()   // Debounced 100ms
  → app.render()     // Debounced 16ms
```

### Toggle Task
```javascript
// User clicks checkbox
app.toggleTask(taskId)
  → taskManager.toggleTask(taskId)
  → task.completed = !task.completed
  → data.totalCompleted++
  → app.saveData()
  → app.render()
  → app.updateCompletedCounter()
```

### Move Task
```javascript
// User swipes or clicks move button
app.moveTask(taskId, direction)
  → taskManager.moveTaskToList(taskId, toList)
  → task.list = newList
  → app.saveData()
  → app.render()
```

---

## Key Functions by Module

### Config
- Constants only, no functions

### Utils
- `generateId()` - Unique task IDs
- `escapeHtml(text)` - XSS prevention
- `formatDate(date)` - Human-readable dates
- `debounce(func, wait)` - Performance optimization
- `safeJsonParse/Stringify()` - Error-safe JSON

### Storage
- `load()` - Load from localStorage
- `save(data)` - Save to localStorage
- `getDefaultData()` - Initial state
- `migrateData(oldData)` - Version migration

### TaskManager
- `addTask(text, listName)` - Create task
- `toggleTask(id)` - Complete/uncomplete
- `moveTaskToList(id, toList)` - Change list
- `deleteTask(id)` - Remove task
- `editTask(id, newText)` - Update text
- `addSubtask(parentId, text)` - Add child
- `findTaskById(id)` - Lookup task

### Renderer
- `render()` - Update all lists
- `createTaskElement(task)` - Create DOM element
- `handleImportanceGradient()` - Visual effects

### App
- `init()` - Initialize app
- `saveData()` - Debounced save (100ms)
- `render()` - Debounced render (16ms)
- `checkDateRollover()` - Daily cleanup
- All user action handlers

---

## File Locations

### Where to Find Things

**Constants:** `/scripts/config.js`
**Utilities:** `/scripts/utils.js`
**Persistence:** `/scripts/storage.js`
**Task Logic:** `/scripts/task-manager.js`
**Rendering:** `/scripts/renderer.js`
**Main App:** `/scripts/app.js`
**Import/Export:** `/scripts/import-export-manager.js`
**Gestures:** `/scripts/interaction-manager.js`
**Styles:** `/styles/main.css`, `/styles/mobile.css`
**HTML:** `/index.html`

---

## Common Modification Scenarios

### Add New Task Property

1. **storage.js** - Update `getDefaultData()`
2. **storage.js** - Add migration in `migrateData()`
3. **task-manager.js** - Handle in `addTask()`
4. **renderer.js** - Display if needed
5. **sync.js** - Include in export if needed

### Add New Feature

1. Create `/scripts/my-feature.js`
2. Add to `/index.html` in correct order
3. Instantiate in `app.js` constructor
4. Access via `this.app` from feature
5. Call `saveData()` and `render()` after changes

### Modify UI

1. **renderer.js** - Change element creation
2. **/styles/** - Update CSS
3. **config.js** - Add class constants
4. **app.js** - Add event listeners

### Change Data Structure

1. **storage.js** - Increment version
2. **storage.js** - Update defaults
3. **storage.js** - Add migration
4. Test with old data!

---

## Debug Checklist

### Task Not Showing?
- [ ] Check `app.data.tasks` in console
- [ ] Verify `task.list` is 'today' or 'tomorrow'
- [ ] Check if `task.completed` (might be hidden)
- [ ] Verify `render()` was called
- [ ] Check console for errors

### Data Not Saving?
- [ ] Verify `saveData()` is called
- [ ] Check localStorage quota
- [ ] Look for JSON stringify errors
- [ ] Verify debounce isn't preventing save
- [ ] Check browser console

### Feature Not Working?
- [ ] Check script load order in HTML
- [ ] Verify module is instantiated
- [ ] Check for JavaScript errors
- [ ] Verify event listeners attached
- [ ] Test in different browser

---

## Performance Thresholds

### Timing
- Save debounce: 100ms
- Render debounce: 16ms (~60fps)
- Long press: 600ms
- Notification: 3000ms auto-hide

### Limits
- Max task text: 200 characters
- Swipe threshold: 50px
- Movement tolerance: 10px
- LocalStorage: ~5-10MB browser dependent

### Scaling
- Up to 1000 tasks: No issues
- 1000-10,000: May need optimization
- 10,000+: Pagination/virtualization needed

---

## Event Listeners

### Keyboard
- **Enter** in input → Add task
- **Escape** in edit → Cancel edit

### Mouse/Touch
- **Click** checkbox → Toggle complete
- **Click** task text → Edit task
- **Click** move button → Move task
- **Click** delete (in delete mode) → Remove task
- **Swipe** left/right → Move between lists
- **Long press** 600ms → Context menu

### Other
- **Page load** → Initialize app
- **Midnight** → Date rollover (on next load)

---

## Config Constants (Most Used)

```javascript
Config.STORAGE_KEY           // 'do-it-later-data'
Config.SAVE_DEBOUNCE_MS     // 100
Config.RENDER_DEBOUNCE_MS   // 16
Config.MAX_TASK_LENGTH      // 200
Config.LONG_PRESS_TIMEOUT_MS // 600
Config.SWIPE_THRESHOLD_PX   // 50

Config.SELECTORS.todayInput
Config.SELECTORS.todayList
Config.CLASSES.taskItem
Config.CLASSES.completed
Config.CLASSES.important
```

---

## Import/Export Format

### Compressed String Format
```
T:!Task1|Task2|Task3~L:Task4|!Task5~C:42
```

- `T:` = Today tasks
- `L:` = Later tasks
- `!` = Important prefix
- `|` = Task delimiter
- `~` = Section delimiter
- `C:` = Completed count

### Methods
- **File:** Download .txt file
- **Clipboard:** Copy/paste text
- **QR Code:** Scan/display QR

---

## Code Quality Metrics

### Module Sizes (Lines of Code)
- app.js: ~700 (largest)
- task-manager.js: ~550
- renderer.js: ~500
- Others: 100-350

### Complexity
- High: `checkDateRollover()` (120 lines, 20 branches)
- Medium: Most other functions
- Low: Utilities and simple methods

### Test Coverage
- Current: 0% (no tests)
- Recommended: 80%+ for critical paths

---

## Browser Storage

### localStorage Keys
- `do-it-later-data` - App data (tasks, metadata)
- `do-it-later-theme` - Theme preference

### Service Worker Cache
- All static assets cached for offline use

---

## Quick Links to Documentation

- **Full README:** `README.md`
- **Architecture:** `human-readable/architecture-overview.md`
- **Modules:** `human-readable/module-breakdown.md`
- **Diagrams:** `visual/` directory
- **Technical:** `technical/` directory
- **Analysis:** `analysis/` directory

---

## Getting Help

### Understanding Flow
1. Check visual diagrams in `visual/`
2. Read architecture overview
3. Review specific module in breakdown

### Making Changes
1. Find module in dependency graph
2. Check "When to Modify" in module breakdown
3. Review call graph for impact
4. Test thoroughly!

### Finding Bugs
1. Check complexity metrics for problem areas
2. Review call graph for flow
3. Add console.log() in suspected functions
4. Use DevMode (tap version 7 times)

---

## Common Patterns

```javascript
// Escape user input
Utils.escapeHtml(userText)

// Find task
taskManager.findTaskById(id)

// After data change
this.app.saveData();
this.app.render();

// Access config
Config.STORAGE_KEY
Config.CLASSES.taskItem

// Create notification
app.showNotification(message, 'success')
```

---

## Version History

- **v2** (Current) - Unified tasks array with `list` property
- **v1** (Legacy) - Separate `today` and `tomorrow` arrays

Migration happens automatically on first load.

---

*For detailed information, see the full documentation in this directory.*