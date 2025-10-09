# Unit Testing Strategy

## Current Status

The Do It Later application uses vanilla JavaScript with global objects/classes, not ES6 modules. This means traditional unit testing with Vitest requires either:

1. **Refactoring to ES6 modules** (not desired per project constraints)
2. **Integration-style testing** using actual browser environment
3. **E2E testing with Playwright** (preferred approach)

## Recommended Approach

Given the project constraints and architecture:

### Primary: E2E Testing with Playwright
- Tests full user workflows
- No code changes needed
- Tests actual browser behavior
- Located in `tests/e2e/`

### Secondary: Manual Testing
- Existing test plans in `tests/SUBTASKS_TEST_PLAN.md`
- Quick verification during development

### Future: Module Refactoring
If unit tests become critical:
1. Add ES6 export/import to modules
2. Update index.html to use `type="module"`
3. Test with Vitest as originally planned

## Current Test Coverage

- ✅ E2E tests: `tests/e2e/*.spec.js`
- ✅ Page Object Model: `tests/e2e/fixtures/app-page.js`
- ✅ Manual test plans: `tests/SUBTASKS_TEST_PLAN.md`
- ❌ Unit tests: Deferred until module refactoring
