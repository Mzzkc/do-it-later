# Changelog

## Major Versions

### v1.16.0 - Import/Export Manager Extraction
- Extracted import/export functionality into separate module
- Improved code organization

### v1.15.0 - Interaction Manager Extraction
- Extracted interaction management (context menus, gestures) into separate module
- Better separation of concerns

### v1.14.0 - TaskManager Integration
- Integrated TaskManager module
- Removed duplicate task methods from app.js

### v1.13.0 - Renderer Integration
- Completed renderer integration
- Removed duplicate rendering methods

### v1.11-1.12 - Module Extraction
- v1.12.0: Integrated extracted modules into app.js
- v1.11.1: Extracted rendering functionality into Renderer module
- v1.11.0: Hyper-compressed QR codes (60-70% size reduction)

### v1.9.0-1.10 - Data Structure Refactor
- **v1.9.0**: Migrated from separate `today`/`later` arrays to unified `tasks` array with `list` property
- **v1.10.0**: Fixed QR code generation with ultra-compression
- Enabled subtasks to exist in different lists than parents

### v1.8.0 - Subtasks Feature
- Implemented subtasks with flat data structure (`parentId` field)
- Long press → "Add Subtask" context menu
- Expand/collapse functionality (▼/▶ icons)
- Auto-complete parent when all subtasks done
- Smart subtask movement between lists
- Important subtasks sorted to top of sublist

### v1.7.0 - Pomodoro Timer
- 25-minute work intervals with round counter
- Persistent timer in bottom corner
- Task completion options after each round
- Haptic feedback on completion

### v1.6.0 - Deadlines
- Set deadlines via long press
- Auto-important 3 days before deadline
- Auto-move to Today on deadline day
- Color-coded deadline badges (red=overdue, orange=today, yellow=soon, blue=future)

### v1.5.0 - Major Refactoring
- Created modular architecture with config.js as single source of truth
- Extracted utils.js, storage.js, sync.js
- Centralized all configuration, selectors, and constants
- Eliminated code duplication

### v1.4.0 - QR Code Compression
- Ultra-compressed QR code format for sync

### v1.3.0 - Import/Export
- QR code sync functionality
- File and clipboard import/export

### Earlier Versions
- v1.2.0 and below: Core two-list system, PWA, offline-first functionality

## Refactoring History

### The Great Modularization (v1.5 - v1.16)
The app underwent extensive refactoring from a monolithic structure to a clean modular architecture:

1. **v1.5**: Established config.js as single source of truth, created utils/storage/sync modules
2. **v1.9**: Unified data structure (single tasks array instead of separate lists)
3. **v1.11-1.16**: Systematic extraction of concerns into focused modules
   - Renderer: DOM updates and UI rendering
   - TaskManager: Task CRUD operations
   - InteractionManager: User interactions and gestures
   - ImportExportManager: Sync and data portability

Result: Clean, maintainable codebase with 18 focused modules instead of one 5000-line file.
