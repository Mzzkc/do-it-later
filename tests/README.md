# Testing Guide for Do It Later

## Overview

This document describes the testing infrastructure for the Do It Later application. The project uses **Playwright for E2E browser automation** to ensure comprehensive test coverage without modifying the vanilla JavaScript codebase.

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

#### `basic-tasks.spec.js`
Tests core task functionality:
- Adding tasks to Today/Later lists
- Task completion and uncomplete
- Moving tasks between lists
- Editing task text
- Deleting tasks
- Important task marking
- Data persistence
- Important task sorting

#### `subtasks.spec.js`
Based on `SUBTASKS_TEST_PLAN.md`:
1. Basic subtask creation
2. Expand/collapse functionality
3. Auto-completion of parent
4. Subtask movement between lists
5. Parent task duplication logic
6. Important subtask sorting
7. Nested subtask editing
8. Empty parent removal

#### `sync-qr.spec.js`
Tests QR v5 format:
- QR code generation
- Empty state handling
- Large dataset compression
- QR data import
- Completed count preservation

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
