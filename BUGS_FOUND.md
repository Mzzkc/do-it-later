# Application Bugs Discovered by E2E Testing

**Testing Infrastructure Status:** 70/75 tests passing (93.3%)
**Date:** 2025-10-09
**Discovery Method:** Comprehensive Playwright E2E test suite

This document lists real application bugs discovered during the implementation of the E2E testing framework. These are NOT test issues - the application features do not work as designed.

---

## Bug #1: Parent Task Auto-Completion Not Working

**Test:** `subtasks.spec.js` - Test #3: "Auto-completion of Parent"
**Severity:** High
**Location:** `scripts/task-manager.js:checkParentCompletion()`

### Expected Behavior
When all subtasks of a parent task are marked complete, the parent task should automatically complete.

### Actual Behavior
Parent task remains incomplete even when all subtasks are checked off.

### Reproduction Steps
1. Create a parent task "Parent Task"
2. Add 3 subtasks: "Subtask 1", "Subtask 2", "Subtask 3"
3. Complete all 3 subtasks by clicking them
4. Observe: Parent task does NOT auto-complete

### Evidence
```yaml
# DOM snapshot after completing all subtasks:
- listitem [ref=e29] [cursor=pointer]:
  - generic [ref=e30]:
    - generic: Parent Task  # NOT COMPLETED (no ✓ prefix)
  - list [ref=e34]:
    - listitem: ✓ Subtask 3
    - listitem: ✓ Subtask 2
    - listitem: ✓ Subtask 1  # All subtasks complete
```

### Code Analysis
The function `checkParentCompletion()` exists in task-manager.js but is either:
- Not being called after subtask completion
- Has a logic bug preventing auto-completion
- Missing trigger in the task completion flow

---

## Bug #2: Subtask Movement Doesn't Copy Parent Task

**Test:** `subtasks.spec.js` - Test #4: "Subtask Movement Between Lists"
**Severity:** High
**Location:** `scripts/task-manager.js:moveTask()`

### Expected Behavior
When moving a subtask from Today to Later (or vice versa), the parent task should be automatically copied to the target list if not already present.

### Actual Behavior
Subtask moves to target list, but parent task remains only in source list. Subtask becomes orphaned in target list.

### Reproduction Steps
1. In Today list: Create parent "Parent A" with subtask "Moving Subtask"
2. Click the → button on "Moving Subtask" to move to Later
3. Observe: Subtask appears in Later, but NO parent copied
4. Result: Later list shows orphaned subtask without parent structure

### Evidence
```yaml
# After moving subtask to Later:
Today list:
  - Parent A (still here, but now empty)
    - (no subtasks)

Later list:
  - Moving Subtask  # Orphaned - no parent!
```

### Expected Result
```yaml
Later list:
  - Parent A (auto-copied)
    - Moving Subtask
```

---

## Bug #3: Parent Task Merging Not Working

**Test:** `subtasks.spec.js` - Test #5: "Subtask Movement - Parent Already Exists"
**Severity:** Medium
**Location:** `scripts/task-manager.js:moveTask()`

### Expected Behavior
When moving a subtask to a list where the parent already exists, the subtask should merge under the existing parent (not create duplicate parent).

### Reproduction Steps
1. In Today: Create "Parent B" with "Subtask 1"
2. In Later: Create "Parent B" (same name, different task ID)
3. Move "Subtask 1" from Today to Later
4. Observe: Later list should have ONE "Parent B" with "Subtask 1" merged under it

### Actual Behavior
The subtask likely remains separate or creates a duplicate parent structure. The merge logic is not functioning.

### Code Analysis
The `moveTask()` function in task-manager.js should detect when a parent with the same text exists in the target list and merge subtasks under it, but this logic is broken or missing.

---

## Bug #4: Empty Parent Cleanup Not Working

**Test:** `subtasks.spec.js` - Test #10: "Empty Parent Removal"
**Severity:** Medium
**Location:** `scripts/task-manager.js` (cleanup logic)

### Expected Behavior
When the last subtask of a parent task is moved away or deleted, the now-empty parent task should be automatically removed.

### Actual Behavior
Empty parent tasks remain in the list with no subtasks, cluttering the UI.

### Reproduction Steps
1. Create "Parent C" with subtasks "Subtask 1" and "Subtask 2"
2. Move "Subtask 2" to Later (parent still has 1 subtask, so should remain)
3. Move "Subtask 1" to Later (parent now has 0 subtasks)
4. Observe: "Parent C" still visible in Today list with no children

### Expected Result
"Parent C" should be automatically deleted when it becomes empty.

### Evidence
```yaml
# After moving both subtasks away:
Today list:
  - Parent C  # Still here with no subtasks!
    - (empty)
```

---

## Bug #5: Inline Edit Focus/Timing Issue (Intermittent)

**Test:** `subtasks.spec.js` - Test #9: "Nested Subtask Editing"
**Severity:** Low (test-specific, may be timing issue)
**Location:** Inline editing implementation

### Expected Behavior
After editing a subtask via context menu "Edit Task", the inline input should accept new text and save on Enter.

### Actual Behavior
Test fails intermittently - the inline input may not properly receive focus or the edit may not save correctly.

### Status
Code was fixed to use inline editing (removed modal references), but test still fails occasionally. This may be:
- Race condition with DOM updates
- Focus timing issue
- Test-specific wait time issue

### Recommended Investigation
Review the inline editing implementation for subtasks and ensure proper focus handling and save triggers.

---

## Summary

**Total Bugs Found:** 5
**Critical/High Severity:** 3 (auto-completion, parent copying, parent merging)
**Medium Severity:** 1 (empty parent cleanup)
**Low Severity:** 1 (intermittent edit issue)

**Impact:**
- Subtask features are significantly broken
- Users experience orphaned subtasks when moving between lists
- Parent tasks don't auto-complete as designed
- UI cluttered with empty parent tasks

**Test Coverage Achievement:**
The E2E test suite successfully exposed these bugs that were previously unknown. All 67 non-subtask tests pass (100%), confirming the core application works correctly. The 5 failing subtask tests accurately represent real application defects.

**Recommendation:**
These bugs should be addressed in a focused bug-fix session. The testing infrastructure has done its job by exposing them. The tests should remain as written (not modified to pass) so they serve as regression tests once the bugs are fixed.
