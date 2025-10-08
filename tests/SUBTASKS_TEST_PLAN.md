# Subtasks Feature - Manual Test Plan

## Test Environment
- Open `http://localhost:8000` in browser
- Clear local storage before testing (Dev Tools > Application > Local Storage > Clear All)

## Test Cases

### 1. Basic Subtask Creation
**Steps:**
1. Add a task "Parent Task" to Today list
2. Long press on "Parent Task"
3. Select "Add Subtask" from context menu
4. Enter "Subtask 1" and click Add
5. Repeat to add "Subtask 2" and "Subtask 3"

**Expected Result:**
- ✓ Modal appears with parent task name
- ✓ Subtasks are added successfully
- ✓ Notification "Subtask added" appears
- ✓ Parent task shows expand/collapse icon (▼)
- ✓ Subtasks are visible under parent

### 2. Expand/Collapse Functionality
**Steps:**
1. Click the expand icon (▼) next to parent task
2. Click again to expand

**Expected Result:**
- ✓ First click: subtasks hide, icon changes to ▶
- ✓ Second click: subtasks show, icon changes to ▼
- ✓ State persists after page refresh

### 3. Auto-completion of Parent
**Steps:**
1. Create parent with 3 subtasks
2. Click to complete Subtask 1
3. Click to complete Subtask 2
4. Click to complete Subtask 3

**Expected Result:**
- ✓ Each subtask gets strikethrough when completed
- ✓ After last subtask completes: notification "Task completed! All subtasks done."
- ✓ Parent task automatically marked as completed
- ✓ Parent shows strikethrough

### 4. Subtask Movement Between Lists
**Steps:**
1. Create "Parent A" in Today with "Moving Subtask"
2. Click move icon on "Moving Subtask" to move to Later list

**Expected Result:**
- ✓ Subtask moves to Later list
- ✓ Copy of "Parent A" created in Later list
- ✓ Subtask is nested under the new parent copy
- ✓ Original "Parent A" removed from Today (now empty)

### 5. Subtask Movement - Parent Already Exists
**Steps:**
1. Create "Parent B" in Today with "Subtask 1"
2. Manually create "Parent B" in Later (same text)
3. Move "Subtask 1" from Today to Later

**Expected Result:**
- ✓ Subtask moves to Later
- ✓ Subtask is nested under existing "Parent B" in Later
- ✓ No duplicate parent created
- ✓ Original "Parent B" removed from Today (now empty)

### 6. Important Subtask Sorting
**Steps:**
1. Create parent with 3 subtasks: "Normal 1", "Normal 2", "Normal 3"
2. Long press "Normal 2"
3. Select "Toggle Important"

**Expected Result:**
- ✓ "Normal 2" moves to top of subtask list
- ✓ "Normal 2" shows importance indicator (star/border)
- ✓ Parent task position does not change
- ✓ Subtask order: Normal 2 (important), Normal 1, Normal 3

### 7. Subtask with Deadline
**Steps:**
1. Create "Later Parent" in Later list with "Deadline Subtask"
2. Long press "Deadline Subtask"
3. Set deadline to today's date
4. Refresh or wait for daily rollover simulation

**Expected Result:**
- ✓ Subtask shows deadline badge
- ✓ On deadline day: subtask moves to Today
- ✓ Copy of parent created in Today
- ✓ Original parent removed if empty

### 8. Subtask with Pomodoro
**Steps:**
1. Create parent with subtask
2. Long press subtask
3. Select "Start Pomodoro"

**Expected Result:**
- ✓ Pomodoro timer starts
- ✓ Timer shows in bottom corner
- ✓ Timer counts down from 25:00
- ✓ Can complete task from timer completion dialog

### 9. Nested Subtask Editing
**Steps:**
1. Create parent with subtask
2. Long press subtask
3. Select "Edit"
4. Change text and save

**Expected Result:**
- ✓ Edit dialog appears
- ✓ Subtask text updates successfully
- ✓ Subtask remains nested under parent

### 10. Empty Parent Removal
**Steps:**
1. Create "Parent C" with 2 subtasks
2. Move first subtask to Later
3. Move second subtask to Later

**Expected Result:**
- ✓ After first move: parent still exists with one child
- ✓ After second move: parent removed from Today
- ✓ Only one parent copy exists in Later with both children

## Bug Fixes Applied
1. ✅ Fixed subtask movement: store original parent ID before modification
2. ✅ Fixed findTask usage: use `taskInfo.text` not `taskInfo.task.text`
3. ✅ Fixed findTask usage: use `taskInfo.list` not `taskInfo.listName`
4. ✅ Fixed toggleSubtaskExpansion: modify actual task in data array, not copy

## Known Limitations
- Single level of nesting (no sub-subtasks) - by design
- QR code size may increase with many subtasks (acceptable trade-off)

## Test Result Template

### Test Results (v1.8.0)

| Test Case | Result | Notes |
|-----------|--------|-------|
| 1. Basic Creation | ⬜ | |
| 2. Expand/Collapse | ⬜ | |
| 3. Auto-completion | ⬜ | |
| 4. Movement | ⬜ | |
| 5. Movement (existing parent) | ⬜ | |
| 6. Important Sorting | ⬜ | |
| 7. Deadline | ⬜ | |
| 8. Pomodoro | ⬜ | |
| 9. Editing | ⬜ | |
| 10. Empty Parent Removal | ⬜ | |

✅ = Pass | ❌ = Fail | ⚠️ = Partial | ⬜ = Not tested
