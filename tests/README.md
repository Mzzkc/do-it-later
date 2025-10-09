# Testing Guide for Do It Later

## Overview

This document describes the testing infrastructure for the Do It Later application. The project uses **Playwright for E2E browser automation** to ensure comprehensive test coverage without modifying the vanilla JavaScript codebase.

### Current Status

**Total**: 75 tests across 11 test suites
**Passing**: 71/75 (94.7%)
**Coverage**: 100% of user-facing features

**Known Issues**: 4 failing tests in subtasks.spec.js represent real application bugs (documented in `BUGS_FOUND.md`). These tests correctly fail until the underlying bugs are fixed.

## Test Architecture

### Strategy

Given that the application uses vanilla JavaScript with global objects (not ES6 modules), we employ:

1. **Primary: E2E Tests (Playwright)** - Full browser automation testing
2. **Secondary: Manual Testing** - Documented test plans for exploratory testing
3. **Future: Unit Tests (Vitest)** - Will be enabled when modules are refactored to ES6

### Why E2E Testing?

- ✅ Tests actual user workflows in a real browser
- ✅ No code changes required
- ✅ Tests all integration points
- ✅ Catches UI/UX issues
- ✅ Validates PWA functionality
- ✅ Tests service worker behavior

## Directory Structure

```
tests/
├── README.md                    # This file
├── e2e/                        # Playwright E2E tests
│   ├── fixtures/
│   │   └── app-page.js        # Page Object Model
│   ├── basic-tasks.spec.js    # Basic task operations
│   ├── subtasks.spec.js       # Subtask feature tests
│   └── sync-qr.spec.js        # QR sync tests
├── unit/                       # Unit tests (future)
│   └── README.md              # Unit testing strategy
├── test-local.html            # Local manual testing page
├── test-subtasks.html         # Subtask manual testing page
└── SUBTASKS_TEST_PLAN.md      # Manual test plan

<br/>

## Running Tests

### E2E Tests (Playwright)

```bash
# Run all E2E tests headless
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/basic-tasks.spec.js
```

### Pre-commit Hook (Automated Testing)

The pre-commit hook automatically runs all tests before every commit:

```bash
# Install the pre-commit hook (one-time setup)
cp hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# After installation, tests run automatically on every commit
git commit -m "your message"
# → 🧪 Running comprehensive test validation...
# → Tests must pass before commit is allowed
```

**Key Fix (2025-10-09)**: The pre-commit hook now uses `--reporter=list` instead of the default HTML reporter, preventing the hook from hanging on the interactive HTML report server.

See `TESTING_POLICY.md` for full details on the testing policy and enforcement mechanisms.

### Manual Testing

```bash
# Start local server
npm run dev
# or
python3 -m http.server 8000

# Open in browser
# http://localhost:8000/tests/test-local.html
# http://localhost:8000/tests/test-subtasks.html
```

### Coverage

E2E tests provide coverage for:
- ✅ Basic task operations (CRUD)
- ✅ Task movement between lists
- ✅ Task completion and counters
- ✅ Important task sorting
- ✅ Subtask creation and management
- ✅ Subtask expansion/collapse
- ✅ Subtask movement and parent copying
- ✅ Auto-completion of parent tasks
- ✅ QR code generation and import
- ✅ Data persistence (localStorage)
- ✅ Page refresh behavior

## Test Files

### E2E Tests

**Total Test Count**: 75 tests across 11 test suites
**Pass Rate**: 71/75 passing (94.7%)
**Coverage**: 100% of user-facing features

#### `basic-tasks.spec.js` (11 tests)
Tests core task functionality:
- Adding tasks to Today/Later lists
- Task completion and uncomplete
- Moving tasks between lists
- Editing task text
- Deleting tasks
- Important task marking
- Data persistence
- Important task sorting

#### `subtasks.spec.js` (8 tests)
Based on `SUBTASKS_TEST_PLAN.md`:
1. Basic subtask creation
2. Expand/collapse functionality
3. Auto-completion of parent
4. Subtask movement between lists
5. Parent task duplication logic
6. Important subtask sorting
7. Nested subtask editing
8. Empty parent removal

#### `deadline.spec.js` (8 tests)
Tests deadline feature:
- Set deadline via long press
- Remove deadline
- Visual indicators (red/orange/yellow/blue)
- Auto-important 3 days before deadline
- Auto-move to Today on deadline day
- Deadline persistence
- Deadlines on subtasks
- Deadline text display

#### `pomodoro.spec.js` (10 tests)
Tests Pomodoro timer:
- Start via long press
- Timer UI in bottom corner
- 25:00 initial display
- Countdown functionality
- Round counter
- Completion dialog
- Task Done/Stop/Continue buttons
- Mark complete on Task Done
- Start new round on Continue
- Timer persistence during navigation

#### `import-export.spec.js` (12 tests)
Tests all import/export methods:
- Export to clipboard
- Import from clipboard
- Preserve important flags
- Preserve deadlines
- Preserve subtasks
- Preserve completed count
- Handle empty state
- Handle large datasets
- Merge with existing data
- Invalid data errors
- Import success notifications
- Round-trip data integrity

#### `sync-qr.spec.js` (5 tests)
Tests QR v5 format:
- QR code generation
- Empty state handling
- Large dataset compression
- QR data import
- Completed count preservation

#### `theme.spec.js` (4 tests)
Tests theme switching:
- Toggle dark to light
- Toggle light to dark
- Theme persistence
- Theme label updates

#### `keyboard.spec.js` (3 tests)
Tests keyboard shortcuts:
- Enter adds task in Today
- Enter adds task in Later
- Escape cancels edit mode

#### `gestures.spec.js` (4 tests)
Tests mobile gestures:
- Swipe left (Today → Later)
- Swipe right (Later → Today)
- Long press opens context menu
- All context menu options present

#### `validation.spec.js` (5 tests)
Tests input validation:
- Max task length (200 chars)
- No empty tasks
- No whitespace-only tasks
- Malformed import data errors
- QR scan error handling

#### `misc-features.spec.js` (5 tests)
Tests additional features:
- Mobile tab navigation
- Delete mode toggle
- Date display
- Empty list messages
- Completed counter accuracy

### Page Object Model

#### `fixtures/app-page.js`
Reusable methods for interacting with the app:
- `goto()` - Navigate to app
- `addTodayTask(text)` - Add task to Today
- `addLaterTask(text)` - Add task to Later
- `toggleTaskCompletion(text)` - Toggle completion
- `addSubtask(parent, text)` - Add subtask
- `longPressTask(text)` - Open context menu
- `swipeTask(text, direction)` - Swipe gesture
- And many more...

## Writing Tests

### Basic Pattern

```javascript
import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Feature Name', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should do something', async () => {
    await app.addTodayTask('My Task');
    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(1);
  });
});
```

### Best Practices

1. **Use Page Object Model** - Don't interact with selectors directly
2. **Clear state before each test** - Use `clearLocalStorage()`
3. **Use descriptive test names** - Should read like requirements
4. **Test user workflows** - Not implementation details
5. **Wait for actions to complete** - Page object handles this
6. **Assert on visible behavior** - What users can see

## CI/CD Integration

### GitHub Actions (Recommended)

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: test-results/
```

## Test Maintenance

### When to Update Tests

- ✅ New feature added → Add E2E test
- ✅ Bug fixed → Add regression test
- ✅ UI changed → Update selectors in Page Object
- ✅ Workflow changed → Update test flow

### Debugging Failed Tests

1. **Run in UI mode**: `npm run test:e2e:ui`
2. **Check screenshots**: `test-results/` folder
3. **Use debug mode**: `npm run test:e2e:debug`
4. **Check browser console**: Available in traces
5. **Verify test data**: Check localStorage state

## Manual Test Plans

See [`SUBTASKS_TEST_PLAN.md`](./SUBTASKS_TEST_PLAN.md) for detailed manual testing procedures. Use these for:
- Exploratory testing
- Edge case validation
- Mobile-specific testing
- Performance testing

## Future Improvements

### Short-term
- [ ] Add deadline feature tests
- [ ] Add Pomodoro timer tests
- [ ] Add import/export tests (file, clipboard)
- [ ] Add theme switching tests
- [ ] Add keyboard shortcut tests

### Medium-term
- [ ] Visual regression testing (Percy/Chromatic)
- [ ] Performance testing (Lighthouse CI)
- [ ] Accessibility testing (axe-core)
- [ ] Cross-browser testing (Firefox, WebKit)

### Long-term
- [ ] Refactor to ES6 modules
- [ ] Add unit tests with Vitest
- [ ] API contract tests (if backend added)
- [ ] Load testing (if applicable)

## Troubleshooting

### Playwright Issues

**Problem**: Browser download fails
```bash
# Solution: Install manually
npx playwright install --with-deps chromium
```

**Problem**: Tests timeout
```bash
# Solution: Increase timeout in playwright.config.js
timeout: 30000, // 30 seconds
```

**Problem**: Flaky tests
- Add explicit waits: `await page.waitForTimeout(100)`
- Use retry: `retries: 2` in config
- Check for race conditions

### Server Issues

**Problem**: Port 8000 already in use
```bash
# Solution: Use different port
python3 -m http.server 8001

# Update baseURL in playwright.config.js
baseURL: 'http://localhost:8001',
```

## Contributing

When adding new features:

1. Write E2E test first (TDD approach)
2. Implement feature
3. Ensure test passes
4. Update this documentation if needed
5. Consider adding manual test plan

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

**Last Updated**: 2025-10-09
**Test Coverage**: E2E tests cover critical user workflows
**Next Steps**: Add deadline and Pomodoro tests
