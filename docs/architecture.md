# Architecture

## Design Philosophy

**Do It (Later)** follows these principles:
- **Vanilla JavaScript**: No frameworks, no build tools
- **Offline-first**: PWA with local storage
- **Zero dependencies**: Except qrcode.min.js for QR generation
- **Privacy-first**: No backend, no tracking, no analytics
- **Modular structure**: Single responsibility principle
- **Config-driven**: All constants in config.js

## Module Architecture

### Dependency Hierarchy
```
config.js (foundation - no dependencies)
  ↓
utils.js (depends on config)
  ↓
storage.js, sync.js (depend on config + utils)
  ↓
task-manager.js, renderer.js (depend on storage)
  ↓
interaction-manager.js, import-export-manager.js
pomodoro.js, deadline-picker.js
qr-handler.js, qr-scanner.js
dev-mode.js
  ↓
app.js (orchestrator - depends on everything)
```

### Module Responsibilities

**config.js** - Single source of truth
- Version number
- All constants (timing, limits, colors)
- DOM selectors
- CSS class names
- Frozen to prevent modification

**utils.js** - Shared utilities
- ID generation
- HTML escaping
- Date formatting
- Common helper functions

**storage.js** - Data persistence
- localStorage wrapper
- Data versioning
- Migration handling

**task-manager.js** - Task operations
- CRUD operations (create, read, update, delete)
- Task movement between lists
- Subtask management
- Parent-child relationships

**renderer.js** - UI rendering
- DOM updates
- Task list rendering
- Subtask visualization
- Visual state management

**interaction-manager.js** - User interactions
- Context menus (long press)
- Gesture handling
- Touch and click events
- Interaction state

**import-export-manager.js** - Data portability
- File export/import
- Clipboard operations
- QR code integration
- Data serialization

**sync.js** - Automated behaviors
- Daily rollover (move overdue to Today)
- Weekly reminders for Later tasks
- Scheduled operations

**pomodoro.js** - Focus timer
- 25-minute timer
- Round tracking
- Notifications
- Haptic feedback

**deadline-picker.js** - Deadline UI
- Date/time picker component
- Deadline setting interface

**qr-handler.js** - QR encoding/decoding
- Ultra-compressed format
- Encode tasks to QR
- Decode QR to tasks

**qr-scanner.js** - Camera scanning
- Camera access
- QR code detection
- Import from camera

**dev-mode.js** - Developer tools
- Debug utilities
- Development helpers

**app.js** - Application orchestrator
- Event binding
- Module coordination
- App initialization
- Global state management

## Data Structure

### Task Object (since v1.9.0)
```javascript
{
  id: 'unique-id',           // Generated UUID
  text: 'Task text',         // User input
  list: 'today' | 'later',   // Current list
  completed: false,          // Completion state
  important: false,          // Priority flag
  parentId: null,            // null = top-level, ID = subtask
  isExpanded: true,          // Subtask visibility state
  deadline: timestamp,       // Optional deadline (ms since epoch)
  createdAt: timestamp       // Creation time
}
```

### Storage Format
```javascript
{
  tasks: [...],              // Flat array of all tasks
  version: 2                 // Data format version
}
```

## Key Design Decisions

### Flat Data Structure (v1.9+)
- Single `tasks` array instead of separate `today`/`later` arrays
- Enables subtasks to exist in different lists than parents
- Simplifies data operations
- Better for future features

### Single-Level Subtasks
- `parentId` field creates parent-child relationships
- No recursion (sub-subtasks not allowed)
- Keeps UI simple and predictable
- Prevents infinite nesting complexity

### No Build Process
- Direct file serving
- Works with simple HTTP server
- No webpack, babel, or other build tools
- Instant deployment

### Config-Driven Development
- All magic numbers → named constants
- Version in one place
- Easy to modify behavior
- Self-documenting code

### Progressive Enhancement
- Core functionality works without JavaScript (app shell)
- Offline-first with service worker
- PWA for installability
- Responsive design for all screens

## Performance Considerations

- **Minimal DOM operations**: Renderer batches updates
- **Event delegation**: Single event listener per list
- **Lazy loading**: QR scanner only loads when needed
- **Compressed sync**: Ultra-compressed QR format
- **Local-first**: No network latency

## Security

- **XSS prevention**: HTML escaping for all user input
- **No eval()**: No dynamic code execution
- **CSP-friendly**: Content Security Policy compatible
- **Local storage only**: No network data transmission
- **No tracking**: Zero analytics or telemetry
