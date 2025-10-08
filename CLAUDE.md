# AI Coding Instructions

## Project Context

**What**: Vanilla JS PWA todo app with two lists (Today/Later). See `.claude/memory/project-brief.md` for full context.

**Stack**: HTML/CSS/JavaScript. No frameworks, no build tools, no dependencies (except qrcode.min.js).

**Version**: Defined in `scripts/config.js` (single source of truth)

## Development Workflow

### Version Management
- **Always** bump version in `scripts/config.js` after code changes
- **Always** bump version in `manifest.json` to match
- Version format: `X.Y.Z` (major.minor.patch)

### Git Workflow
- Commit after completing all related changes
- Push to `main` branch (auto-deploys to GitHub Pages)
- Use descriptive commit messages with version number

### Code Standards
- **Modular**: Keep modules focused on single responsibility
- **Config-driven**: All constants/selectors in `config.js`
- **No magic numbers**: Use named constants
- **Vanilla JS**: No frameworks or transpilers
- **Escape user input**: Always use `escapeHtml()` from utils.js

## Module Structure

```
scripts/
├── config.js           - Constants, version, selectors (load first)
├── utils.js            - Shared utilities
├── storage.js          - localStorage wrapper
├── task-manager.js     - Task CRUD
├── renderer.js         - DOM rendering
├── interaction-manager.js - User interactions
├── import-export-manager.js - Sync functionality
├── sync.js, pomodoro.js, deadline-picker.js, etc.
└── app.js              - Orchestrator (loads last)
```

**Dependency rule**: Modules higher in hierarchy don't depend on lower ones.

## Data Structure

Tasks are stored as single flat array (since v1.9.0):
```javascript
{
  id: 'uuid',
  text: 'string',
  list: 'today' | 'later',
  completed: boolean,
  important: boolean,
  parentId: null | 'uuid',  // null = top-level
  isExpanded: boolean,       // UI state
  deadline: timestamp,       // optional
  createdAt: timestamp
}
```

## Testing

- Manual testing required (no automated test suite)
- Test files in `tests/` directory
- Use browser console for debugging
- Test in Chrome/Firefox/Safari

## Session Tracking

**At end of session**, use the `project-status-updater` agent to update `.claude/memory/status.md` with:
- What was accomplished
- Current working state
- Next steps
- Any blockers or notes

## Key Conventions

- **Think first**: Your first approach is usually wrong - reconsider before coding
- **Keep it simple**: Prefer simple solutions following best practices
- **Incremental changes**: Small, focused commits with version bumps
- **Check twice**: Review what you might have missed or overlooked

## File Organization

- **Code**: `scripts/`, `styles/`, root HTML files
- **User docs**: `README.md`
- **AI context**: `.claude/memory/` (project-brief.md, status.md)
- **Technical docs**: `docs/` (architecture.md, changelog.md)
- **Tests**: `tests/`
- **Assets**: `icons/`

## Common Tasks

**Add new feature**:
1. Read project-brief.md and status.md for context
2. Plan the change (which modules affected?)
3. Update code
4. Bump version in config.js and manifest.json
5. Test manually
6. Commit with descriptive message
7. Push to main

**Fix bug**:
1. Reproduce and identify affected module
2. Fix in appropriate module
3. Bump patch version
4. Test fix
5. Commit and push

**Refactor**:
1. Ensure changes are isolated to specific modules
2. Maintain dependency hierarchy
3. Bump minor version
4. Test thoroughly
5. Commit and push

## Resources

- Live app: https://mzzkc.github.io/do-it-later/
- Repo: https://github.com/Mzzkc/do-it-later
- Local dev: `python3 -m http.server 8000` then open http://localhost:8000
