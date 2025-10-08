# Do It (Later) - Codebase Flow Documentation

## Overview

This documentation provides a complete analysis of the Do It (Later) codebase, mapping all information flow, function calls, object relationships, and data dependencies. The app is a vanilla JavaScript Progressive Web App (PWA) for task management with a two-list system (Today/Later).

## Navigation Guide

### 📁 Documentation Structure

- **[visual/](visual/)** - Mermaid diagrams visualizing architecture and flow
  - `module-dependency-graph.md` - Module dependency hierarchy
  - `data-flow-diagram.md` - Data flow through the application
  - `function-call-graph.md` - Function call relationships
  - `event-flow-diagram.md` - User interaction and event flow
  - `object-relationships.md` - Class and object relationships

- **[technical/](technical/)** - Machine-readable documentation
  - `modules.json` - Module metadata and exports
  - `functions.json` - All functions with signatures and locations
  - `data-flow.json` - Data transformation paths
  - `dependencies.json` - Module dependencies graph
  - `call-graph.json` - Complete function call graph

- **[human-readable/](human-readable/)** - Narrative documentation
  - `architecture-overview.md` - High-level architecture explanation
  - `module-breakdown.md` - Detailed module descriptions
  - `data-lifecycle.md` - How data flows from input to storage
  - `event-handling.md` - Event system and user interactions
  - `state-management.md` - Application state and persistence

- **[analysis/](analysis/)** - Insights and metrics
  - `complexity-metrics.md` - Code complexity analysis
  - `patterns.md` - Identified design patterns
  - `bottlenecks.md` - Performance considerations
  - `recommendations.md` - Improvement suggestions

## Quick Start

### Key Entry Points

1. **`index.html`** - Main HTML entry, loads all scripts in dependency order
2. **`scripts/app.js`** - Main application class (`DoItTomorrowApp`)
3. **`sw.js`** - Service worker for PWA functionality

### Core Module Hierarchy

```
Config → Utils → Storage → TaskManager → Renderer → App
                     ↓
                   Sync
```

### Critical Data Flows

1. **User Input → Task Creation**
   - Input field → `app.addTask()` → `TaskManager.addTask()` → `Storage.save()` → `Renderer.render()`

2. **Task Completion**
   - Checkbox click → `app.toggleTask()` → `TaskManager.toggleTask()` → Update data → Save → Render

3. **Task Movement (Swipe/Button)**
   - Swipe gesture → `app.moveTask()` → `TaskManager.moveTaskToList()` → Save → Animated render

4. **Data Persistence**
   - All changes → `app.saveData()` (debounced) → `Storage.save()` → localStorage

## Architecture Summary

### Module Categories

1. **Core Infrastructure** (No dependencies)
   - `config.js` - Application constants and configuration

2. **Utilities** (Depends on Config)
   - `utils.js` - Shared utility functions
   - `storage.js` - localStorage operations

3. **Data Management** (Depends on Utils/Storage)
   - `task-manager.js` - Task CRUD operations
   - `sync.js` - Import/export synchronization

4. **UI Components** (Depends on Core + Data)
   - `renderer.js` - DOM rendering and updates
   - `interaction-manager.js` - Touch/mouse interactions
   - `deadline-picker.js` - Deadline UI component
   - `pomodoro.js` - Pomodoro timer feature

5. **Features** (Depends on multiple layers)
   - `import-export-manager.js` - Import/export orchestration
   - `qr-handler.js` - QR code generation
   - `qr-scanner.js` - QR code scanning
   - `dev-mode.js` - Developer tools

6. **Main Application** (Orchestrates all modules)
   - `app.js` - Main application controller

### Data Structure

```javascript
{
  tasks: [
    {
      id: "unique-id",
      text: "Task description",
      list: "today" | "tomorrow",
      completed: boolean,
      important: boolean,
      subtasks: [...],
      deadline: "ISO-date" | null,
      parentId: "parent-task-id" | null
    }
  ],
  lastUpdated: timestamp,
  currentDate: "YYYY-MM-DD",
  totalCompleted: number,
  version: 2
}
```

## Key Patterns

- **Singleton Classes**: All major modules are instantiated once in `app.js`
- **Event-Driven**: DOM events trigger state changes
- **Debounced Operations**: Saves and renders are debounced for performance
- **Modular Architecture**: Clear separation of concerns
- **No Build Tools**: Direct script loading in dependency order
- **LocalStorage Persistence**: All data stored in single key
- **Animation-First UI**: CSS animations for all transitions

## Getting Started

For specific use cases:

- **Understanding data flow**: Start with [visual/data-flow-diagram.md](visual/data-flow-diagram.md)
- **Finding where to make changes**: See [human-readable/module-breakdown.md](human-readable/module-breakdown.md)
- **Performance optimization**: Check [analysis/bottlenecks.md](analysis/bottlenecks.md)
- **Adding new features**: Review [human-readable/architecture-overview.md](human-readable/architecture-overview.md)