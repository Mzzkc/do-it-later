# Testing Policy

## Mandatory Testing Requirements

**⚠️ CRITICAL**: All code changes MUST pass tests before committing. No exceptions.

This project maintains 100% feature coverage through automated E2E tests. This policy ensures code quality, prevents regressions, and maintains user trust.

## Installation

### Pre-commit Hook Setup
The pre-commit hook automatically runs tests before every commit. **Install it once:**

```bash
# Copy the hook to your local .git/hooks directory
cp hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Verification:**
```bash
# Make a test commit - hook should run automatically
git commit -m "test" --allow-empty
```

You should see:
```
🧪 Running comprehensive test validation before commit...
🔍 Checking for skipped tests...
...
```

## The Testing Commandments

### 1. Test Before Commit
```bash
# ALWAYS run before committing
npm run test:e2e
```

**Pre-commit hook enforces this automatically** (after installation).
If tests fail, the commit is blocked.

### 2. Write Tests First (TDD)
When adding a new feature:
1. Write the E2E test FIRST
2. Verify test fails (red)
3. Implement the feature
4. Verify test passes (green)
5. Refactor if needed

**Benefits**:
- Forces clear requirements
- Ensures testable code
- Prevents untested features
- Documents expected behavior

### 3. Add Regression Tests for Bugs
When fixing a bug:
1. Write a test that reproduces the bug
2. Verify test fails
3. Fix the bug
4. Verify test passes
5. Commit both test and fix together

**This prevents bugs from reoccurring.**

### 4. Maintain 100% Feature Coverage
**Current Status**: 69+ tests covering 100% of user-facing features

**Coverage Target**: ≥90% of critical user workflows

All user-facing features MUST have corresponding E2E tests:
- ✅ Task CRUD operations
- ✅ Subtasks and hierarchy
- ✅ Deadlines and auto-behaviors
- ✅ Pomodoro timer
- ✅ Import/Export (all methods)
- ✅ Theme switching
- ✅ Keyboard shortcuts
- ✅ Mobile gestures
- ✅ Validation and error handling

### 5. Never Skip Tests
**Forbidden**:
- `git commit --no-verify` (bypasses pre-commit hook)
- Commenting out failing tests
- Pushing with known test failures
- Merging PRs with failing tests

**Acceptable** (with justification):
- Marking tests as `.skip()` temporarily during development
- Must have GitHub issue tracking why test is skipped
- Must be re-enabled before PR approval

## Testing Workflows

### Daily Development

```bash
# 1. Start your work
git checkout -b feature/my-feature

# 2. Write failing test first
# Edit tests/e2e/my-feature.spec.js

# 3. Run tests (should fail)
npm run test:e2e -- my-feature.spec.js

# 4. Implement feature
# Edit scripts/my-module.js

# 5. Run tests again (should pass)
npm run test:e2e -- my-feature.spec.js

# 6. Run ALL tests before commit
npm run test:e2e

# 7. Commit (pre-commit hook runs tests automatically)
git add .
git commit -m "Add my feature with tests"
```

### Bug Fixes

```bash
# 1. Reproduce bug with test
# Edit tests/e2e/regression.spec.js
test('should not crash on empty input', async () => {
  // Test that reproduces bug
});

# 2. Verify test fails
npm run test:e2e -- regression.spec.js

# 3. Fix the bug
# Edit scripts/buggy-module.js

# 4. Verify test passes
npm run test:e2e -- regression.spec.js

# 5. Commit test + fix together
git add .
git commit -m "Fix: Prevent crash on empty input

Adds regression test to prevent future occurrence.
Refs #123"
```

### Refactoring

```bash
# 1. Run all tests BEFORE refactoring
npm run test:e2e
# All pass? Good!

# 2. Refactor code
# Edit scripts/module-to-refactor.js

# 3. Run tests continuously during refactor
npm run test:e2e:ui
# Use UI mode for faster feedback

# 4. Verify all tests still pass
npm run test:e2e

# 5. Commit refactoring
git commit -m "Refactor: Extract helper function

All tests pass, no behavior changes."
```

## Prohibited Behaviors (ZERO TOLERANCE)

### ❌ NEVER Do These Things

**1. Skip Failing Tests**
```javascript
// ❌ FORBIDDEN - Pre-commit hook will warn
test.skip('broken test', async () => { ... });
describe.skip('Broken Feature', () => { ... });
```

**2. Use test.only() in Commits**
```javascript
// ❌ FORBIDDEN - Pre-commit hook will BLOCK commit
test.only('just this one', async () => { ... });
// This prevents full test suite from running!
```

**3. Delete Tests to Fix Failures**
```javascript
// ❌ FORBIDDEN - Pre-commit hook checks test count
// If you had 69 tests and now have 65, commit is BLOCKED
```

**4. Comment Out Failing Tests**
```javascript
// ❌ FORBIDDEN - Pre-commit hook detects excessive commented tests
// test('this was failing so I commented it', async () => {
//   await app.doSomething();
// });
```

**5. Write Empty Tests**
```javascript
// ❌ FORBIDDEN - Pre-commit hook detects empty test bodies
test('fake test to inflate count', async () => {
  // Nothing here - provides no value!
});
```

**6. Stub Out Functionality**
```javascript
// ❌ FORBIDDEN - Makes tests pass but breaks features
async function criticalFeature() {
  // TODO: implement later
  return true; // Cheating to make test pass!
}
```

**7. Modify Tests to Pass Without Fixing Bugs**
```javascript
// ❌ FORBIDDEN - Test is now meaningless
test('should validate input', async () => {
  // Original: expect(result).toBe(true);
  expect(result).toBe(false); // Changed to match broken code!
});
```

**8. Bypass Pre-Commit Hook**
```bash
# ❌ FORBIDDEN without explicit team approval
git commit --no-verify
```

### What You SHOULD Do Instead

**When Tests Fail**:
1. ✅ Read the error message carefully
2. ✅ Run `npm run test:e2e:ui` to debug
3. ✅ Fix the actual bug in the code
4. ✅ OR update tests if requirements changed legitimately
5. ✅ Ask for help if stuck

**When Adding Features**:
1. ✅ Write test FIRST (TDD)
2. ✅ Implement feature to make test pass
3. ✅ Ensure ALL tests still pass
4. ✅ Commit test + feature together

**When Refactoring**:
1. ✅ Run all tests before starting
2. ✅ Keep tests running during refactor
3. ✅ Ensure no tests break
4. ✅ Tests prove refactor is safe

## Enforcement Mechanisms

### Pre-Commit Hook (Advanced Validation)
Source: `hooks/pre-commit` (tracked in repo)
Installed location: `.git/hooks/pre-commit` (local, must be copied)

This hook is intelligent and checks for cheating:

**Automatic Checks**:
1. ✅ Detects `test.skip()` and `describe.skip()` - **WARNS**
2. ✅ Detects `test.only()` and `describe.only()` - **BLOCKS COMMIT**
3. ✅ Verifies test count hasn't decreased - **BLOCKS if <69 tests**
4. ✅ Detects excessive commented-out tests - **WARNS**
5. ✅ Detects empty test bodies - **BLOCKS COMMIT**
6. ✅ Runs full E2E test suite - **BLOCKS if any fail**
7. ✅ Verifies tests actually executed - **BLOCKS if suspicious**

**If tests fail**:
- Commit is BLOCKED
- Clear error message explains what to do
- Cannot bypass without approval
- Must fix tests or code, not cheat

**Sample Output**:
```bash
🔍 Checking for test.only() (blocks commit)...
❌ COMMIT BLOCKED: test.only() found!

tests/e2e/my-test.spec.js:42:  test.only('debug this', ...

Remove .only() before committing.
```

### GitHub Actions CI/CD
Location: `.github/workflows/test.yml`

Runs on every push and pull request.

**If tests fail on CI**:
- PR cannot be merged
- Deployment is blocked
- Team is notified

### Code Review Checklist
Before approving any PR, reviewers must verify:
- [ ] All tests pass in CI
- [ ] New features have new tests
- [ ] Bug fixes have regression tests
- [ ] Test coverage hasn't decreased
- [ ] Tests are clear and well-named

## Test Organization

### Directory Structure
```
tests/
├── e2e/                    # E2E Playwright tests
│   ├── fixtures/
│   │   └── app-page.js    # Page Object Model
│   ├── basic-tasks.spec.js     # 11 tests
│   ├── subtasks.spec.js        # 8 tests
│   ├── deadline.spec.js        # 8 tests
│   ├── pomodoro.spec.js        # 10 tests
│   ├── import-export.spec.js   # 12 tests
│   ├── sync-qr.spec.js         # 5 tests
│   ├── theme.spec.js           # 4 tests
│   ├── keyboard.spec.js        # 3 tests
│   ├── gestures.spec.js        # 4 tests
│   ├── validation.spec.js      # 5 tests
│   └── misc-features.spec.js   # 5 tests
└── README.md              # Testing guide
```

### Test Naming Convention
```javascript
// ✅ Good test names (describe user behavior)
test('should add task to Today list when Enter is pressed')
test('should mark parent complete when all subtasks are done')
test('should persist theme preference after page reload')

// ❌ Bad test names (describe implementation)
test('should call addTask function')
test('should set completed property to true')
test('should update localStorage')
```

### Test Structure (Arrange-Act-Assert)
```javascript
test('feature description', async () => {
  // Arrange: Set up test data
  await app.addTodayTask('Test task');

  // Act: Perform action
  await app.toggleTaskCompletion('Test task');

  // Assert: Verify outcome
  const isCompleted = await app.isTaskCompleted('Test task');
  expect(isCompleted).toBe(true);
});
```

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test tests/e2e/deadline.spec.js
```

### Interactive UI Mode
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### With Test Report
```bash
npm run test:e2e
npx playwright show-report
```

## Debugging Failed Tests

### 1. Check the Error Message
```bash
npm run test:e2e
# Read the error output carefully
```

### 2. Run in UI Mode
```bash
npm run test:e2e:ui
# See visual feedback and time-travel debugging
```

### 3. Check Screenshots/Videos
```
test-results/
├── test-name/
│   ├── screenshot.png   # Failure screenshot
│   └── video.webm       # Recorded video
```

### 4. Run in Debug Mode
```bash
npm run test:e2e:debug
# Step through test line by line
```

### 5. Check for Flaky Tests
```bash
# Run test multiple times
for i in {1..10}; do npm run test:e2e -- my-test.spec.js; done
```

If flaky, add retries or fix timing issues.

## Best Practices

### DO
✅ Write tests for all user-facing features
✅ Use Page Object Model for reusable methods
✅ Test happy paths AND edge cases
✅ Make tests independent (no shared state)
✅ Use descriptive test names
✅ Test user workflows, not implementation
✅ Keep tests fast (mock slow operations)
✅ Review test failures immediately

### DON'T
❌ Skip tests to "save time"
❌ Commit code without running tests
❌ Test internal implementation details
❌ Create interdependent tests
❌ Use fixed waits (use waitFor instead)
❌ Ignore flaky tests
❌ Write tests after code is done
❌ Bypass pre-commit hooks

## Consequences of Policy Violations

### First Offense
- Warning from code reviewer
- Must fix tests immediately
- PR blocked until fixed

### Second Offense
- Formal discussion with team
- Review of testing workflow
- Additional training if needed

### Continued Violations
- Loss of commit privileges
- Code review required for all commits
- Pair programming on test writing

**We take testing seriously because our users depend on us.**

## Special Instructions for AI Agents/Assistants

**If you are an AI agent (Claude, GPT, Copilot, etc.) working on this codebase:**

### MANDATORY Requirements

1. **ALWAYS run tests before committing**
   ```bash
   npm run test:e2e
   ```

2. **NEVER cheat to make tests pass**
   - ❌ Don't use `test.skip()` to skip failing tests
   - ❌ Don't delete tests that fail
   - ❌ Don't comment out failing tests
   - ❌ Don't modify test assertions to match broken code
   - ❌ Don't stub out functionality
   - ❌ Don't use `test.only()` in commits

3. **Fix the ACTUAL problem**
   - ✅ If tests fail, fix the CODE, not the tests
   - ✅ If requirements changed, discuss with user first
   - ✅ Write new tests for new features BEFORE coding
   - ✅ Add regression tests for bug fixes

4. **Be honest about test failures**
   - ✅ Report test failures to the user immediately
   - ✅ Explain what's broken and why
   - ✅ Suggest proper fixes (not workarounds)
   - ✅ Don't hide problems

5. **Understand test-driven development**
   - ✅ Write test first (red)
   - ✅ Implement feature (green)
   - ✅ Refactor if needed (still green)
   - ✅ Commit everything together

### Example: Correct Workflow

**User asks**: "Add a feature to duplicate tasks"

**❌ WRONG Approach**:
```javascript
// Add feature without test
function duplicateTask(id) {
  // Implementation...
}
// Commit without tests
```

**✅ CORRECT Approach**:
```javascript
// 1. Write test FIRST
test('should duplicate task with all properties', async () => {
  await app.addTodayTask('Original');
  await app.duplicateTask('Original');

  const tasks = await app.getTodayTasks();
  expect(tasks.length).toBe(2);
});

// 2. Run test (should FAIL)
npm run test:e2e -- duplicate.spec.js

// 3. Implement feature
function duplicateTask(id) {
  // Real implementation...
}

// 4. Run test (should PASS)
npm run test:e2e -- duplicate.spec.js

// 5. Run ALL tests
npm run test:e2e

// 6. Commit if all green
git commit -m "Add task duplication feature

- Adds duplicateTask() method
- Copies all task properties
- Includes E2E test coverage"
```

### When Tests Fail

**User reports**: "Feature X is broken"

**❌ WRONG Response**:
```javascript
// Skip the broken test to unblock commit
test.skip('Feature X', async () => { ... });

// OR delete the test
// (test just disappears)

// OR modify test to pass
expect(broken).toBe(false); // Changed from true!
```

**✅ CORRECT Response**:
```
I see that Feature X is broken. Let me:

1. First, I'll write a test that reproduces the bug
2. The test will fail (confirming the bug)
3. Then I'll fix the underlying code
4. The test will pass (confirming the fix)
5. All existing tests will still pass (no regressions)

Let me start by adding the regression test...
```

### Red Flags to Avoid

If you find yourself thinking:
- "I'll just skip this test for now" → STOP
- "I'll delete this test that's failing" → STOP
- "I'll comment out this test temporarily" → STOP
- "I'll change the assertion to match the output" → STOP
- "I'll stub this out and come back later" → STOP
- "I'll use --no-verify to bypass the hook" → STOP

**Instead, STOP and ask the user for guidance.**

### Trust but Verify

The pre-commit hook will catch most cheating attempts, but:
- Be ethical and write quality code
- Tests protect users from bugs
- Cheating tests = broken features for users
- User trust is more valuable than quick commits

## Questions?

**Q: What if tests are failing but it's not my code?**
A: Fix the tests or report to the team. Don't commit on broken tests.

**Q: What if I need to commit urgently for a hotfix?**
A: Tests still run. If they fail, the hotfix has bugs. Fix tests first.

**Q: What if CI is broken?**
A: Fix CI first. No merges until CI is green.

**Q: What if writing tests takes too long?**
A: Tests save more time than they cost. Bugs in production are expensive.

**Q: Can I merge a PR with skipped tests?**
A: Only with explicit approval and GitHub issue tracking the skip.

**Q: (AI Agent) What if I can't figure out how to fix a failing test?**
A: Report to the user honestly. Explain the problem and ask for guidance. Never cheat to hide the issue.

---

## Summary

**The Golden Rule**: If it's not tested, it's broken.

**The Workflow**:
1. Write test
2. Run test (should fail)
3. Write code
4. Run test (should pass)
5. Run all tests
6. Commit

**The Promise**: Every commit maintains 100% feature coverage.

---

**Last Updated**: 2025-10-09
**Policy Version**: 1.0
**Enforcement**: Mandatory for all contributors
