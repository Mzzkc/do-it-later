# Do It (Later) - Project Brief

## What It Is
A maintenance-free PWA todo app with exactly two lists: **Today** and **Later**. Built with vanilla HTML/CSS/JavaScript with zero dependencies (except qrcode.min.js for QR generation).

## Philosophy
Ultra-simple task management that gets out of your way. No frameworks, no build tools, no backend, no tracking. Just tasks.

## Core Features
- **Two-list system**: Today and Later
- **Task management**: Add, complete, move between lists, subtasks (one level)
- **Deadlines**: Auto-prioritize (important 3 days before) and auto-move (to Today on deadline day)
- **Pomodoro timer**: 25-minute focus sessions with round tracking
- **Offline-first PWA**: Works without internet, installable
- **Privacy-first sync**: Local storage + manual export/import (file, clipboard, QR code)
- **Important tasks**: Priority sorting with star indicator
- **Daily rollover**: Gentle weekly reminders for Later tasks

## Technical Architecture

### File Structure
```
scripts/
├── app.js                     - Main coordinator, event handlers
├── config.js                  - Single source of truth (version, constants, selectors)
├── task-manager.js            - Task CRUD operations
├── renderer.js                - DOM rendering, UI updates
├── interaction-manager.js     - Context menus, gestures, user interactions
├── import-export-manager.js   - File/clipboard/QR export logic
├── storage.js                 - localStorage wrapper
├── sync.js                    - Rollover, weekly reminders
├── pomodoro.js                - Timer functionality
├── deadline-picker.js         - Deadline UI component
├── qr-handler.js              - QR encode/decode
├── qr-scanner.js              - Camera-based QR scanning
├── utils.js                   - Shared utilities
├── dev-mode.js                - Developer tools
└── qrcode.min.js              - Third-party QR generation
```

### Data Structure (v1.9+)
Single `tasks` array with `list` property (replaced old separate arrays):
```javascript
{
  id: 'unique-id',
  text: 'Task text',
  list: 'today' | 'later',
  completed: false,
  important: false,
  parentId: null,           // null = top-level, ID = subtask
  isExpanded: true,         // UI state for subtasks
  deadline: timestamp,      // Optional
  createdAt: timestamp
}
```

### Key Design Decisions
- **Modular extraction**: App grew from single file → 18 modules (v1.5-1.16 refactors)
- **Flat subtasks**: One level only, using `parentId` (no recursion)
- **Ultra-compressed QR**: Custom format for sync (60-70% size reduction)
- **No build step**: Direct file serving, works with `python3 -m http.server`
- **Version in config.js**: Single source, bumped after every change

## Comprehensive Flow Documentation

**Location**: `docs/codebase-flow/`

Complete information flow and data accounting documentation includes:
- **153 functions** mapped with call chains and dependencies
- **6 major data flows** from user input to rendering
- **Module dependency graph** with 6-layer hierarchy
- **Event flow** for all user interactions
- **Design patterns** (15 identified and documented)
- **Visual diagrams** (Mermaid flowcharts, sequence diagrams, class diagrams)
- **Technical specs** (JSON files for programmatic access)
- **Human-readable** guides for understanding and modifying code

**Key principle**: Consult flow docs before making changes, update them after.

Start at: `docs/codebase-flow/INDEX.md` or `docs/codebase-flow/QUICK-REFERENCE.md`

## Current Version
v1.17.1 (see config.js for authoritative version)

## Deployment
- **Repo**: https://github.com/Mzzkc/do-it-later
- **Live**: https://mzzkc.github.io/do-it-later/
- **Deploy method**: GitHub Pages, auto-deploys on push to main
- **No CI/CD**: Just push and it's live

## Known Context
- User prefers incremental changes with frequent version bumps
- Project has undergone extensive refactoring (v1.5→v1.16)
- Many old status/refactoring docs in root (being cleaned up)
- Test files exist but aren't in organized structure (being fixed)
