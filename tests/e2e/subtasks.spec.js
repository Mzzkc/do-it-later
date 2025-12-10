/**
 * E2E Tests: Subtask Feature
 * Based on tests/SUBTASKS_TEST_PLAN.md
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Subtask Feature', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('1. Basic Subtask Creation', async () => {
    // Add parent task
    await app.addTodayTask('Parent Task');

    // Add subtasks
    await app.addSubtask('Parent Task', 'Subtask 1');
    await app.addSubtask('Parent Task', 'Subtask 2');
    await app.addSubtask('Parent Task', 'Subtask 3');

    // Verify subtasks exist
    const subtasks = await app.getSubtasks('Parent Task');
    expect(subtasks.length).toBe(3);

    // Verify parent has expand icon
    const task = await app.getTaskByText('Parent Task');
    const expandIcon = await task.locator('.expand-icon').count();
    expect(expandIcon).toBeGreaterThan(0);
  });

  test('2. Expand/Collapse Functionality', async ({ page }) => {
    await app.addTodayTask('Parent Task');
    await app.addSubtask('Parent Task', 'Subtask 1');

    // Initially expanded
    let expanded = await app.isSubtaskExpanded('Parent Task');
    expect(expanded).toBe(true);

    // Collapse
    await app.toggleSubtaskExpansion('Parent Task');
    expanded = await app.isSubtaskExpanded('Parent Task');
    expect(expanded).toBe(false);

    // Expand again
    await app.toggleSubtaskExpansion('Parent Task');
    expanded = await app.isSubtaskExpanded('Parent Task');
    expect(expanded).toBe(true);

    // Persist after reload
    await app.reload();
    expanded = await app.isSubtaskExpanded('Parent Task');
    expect(expanded).toBe(true);
  });

  test('3. Auto-completion of Parent', async () => {
    await app.addTodayTask('Parent Task');
    await app.addSubtask('Parent Task', 'Subtask 1');
    await app.addSubtask('Parent Task', 'Subtask 2');
    await app.addSubtask('Parent Task', 'Subtask 3');

    // Complete all subtasks
    await app.toggleTaskCompletion('Subtask 1');
    await app.toggleTaskCompletion('Subtask 2');
    await app.toggleTaskCompletion('Subtask 3');

    // Wait for auto-completion logic to run and re-render
    await app.page.waitForTimeout(500);

    // Parent should auto-complete
    const parentCompleted = await app.isTaskCompleted('Parent Task');
    expect(parentCompleted).toBe(true);

    // Should show notification
    await app.waitForNotification('All subtasks done');
  });

  test('3a. Auto-uncompletion of Parent when Subtask Toggled Incomplete', async () => {
    await app.addTodayTask('Parent Task');
    await app.addSubtask('Parent Task', 'Subtask 1');
    await app.addSubtask('Parent Task', 'Subtask 2');
    await app.addSubtask('Parent Task', 'Subtask 3');

    // Complete all subtasks (parent will auto-complete)
    await app.toggleTaskCompletion('Subtask 1');
    await app.toggleTaskCompletion('Subtask 2');
    await app.toggleTaskCompletion('Subtask 3');

    // Wait for auto-completion logic to run and re-render
    await app.page.waitForTimeout(500);

    // Verify parent is completed
    let parentCompleted = await app.isTaskCompleted('Parent Task');
    expect(parentCompleted).toBe(true);

    // Now toggle one subtask back to incomplete
    await app.toggleTaskCompletion('Subtask 2');

    // Wait for logic to run
    await app.page.waitForTimeout(500);

    // Parent should auto-uncomplete (regression test for bug)
    parentCompleted = await app.isTaskCompleted('Parent Task');
    expect(parentCompleted).toBe(false);

    // Subtask 2 should be incomplete
    const subtask2Completed = await app.isTaskCompleted('Subtask 2');
    expect(subtask2Completed).toBe(false);

    // Subtask 1 and 3 should still be complete
    const subtask1Completed = await app.isTaskCompleted('Subtask 1');
    const subtask3Completed = await app.isTaskCompleted('Subtask 3');
    expect(subtask1Completed).toBe(true);
    expect(subtask3Completed).toBe(true);
  });

  test('4. Subtask Movement Between Lists', async () => {
    await app.addTodayTask('Parent A');
    await app.addSubtask('Parent A', 'Moving Subtask');

    // Move subtask to Later
    await app.clickMoveButton('Moving Subtask');

    // Verify subtask moved
    const subtaskInLater = await app.isTaskInList('Moving Subtask', 'later');
    expect(subtaskInLater).toBe(true);

    // Parent should be copied to Later
    const parentInLater = await app.isTaskInList('Parent A', 'later');
    expect(parentInLater).toBe(true);

    // Original parent should be removed from Today (if empty)
    const parentInToday = await app.isTaskInList('Parent A', 'today');
    expect(parentInToday).toBe(false);
  });

  test('5. Subtask Movement - Parent Already Exists', async () => {
    // Create Parent B in Today with subtask
    await app.addTodayTask('Parent B');
    await app.addSubtask('Parent B', 'Subtask 1');

    // Manually create Parent B in Later
    await app.addLaterTask('Parent B');

    // Move subtask from Today to Later
    await app.clickMoveButton('Subtask 1');

    // Verify only one Parent B exists in Later (count top-level parents only)
    const laterParents = await app.page.locator('#tomorrow-list > .task-item:has-text("Parent B")').all();
    expect(laterParents.length).toBe(1);

    // Verify parent is in Later list
    const parentInLater = await app.isTaskInList('Parent B', 'later');
    expect(parentInLater).toBe(true);

    // Verify subtask is under the Later parent
    const subtasksInLater = await app.getSubtasks('Parent B');
    expect(subtasksInLater.length).toBe(1);
  });

  test('6. Important Subtask Sorting', async () => {
    await app.addTodayTask('Parent Task');
    await app.addSubtask('Parent Task', 'Normal 1');
    await app.addSubtask('Parent Task', 'Normal 2');
    await app.addSubtask('Parent Task', 'Normal 3');

    // Mark Normal 2 as important
    await app.longPressTask('Normal 2');
    await app.selectContextMenuItem('Toggle Important');

    // Verify Normal 2 moved to top
    const subtasks = await app.getSubtasks('Parent Task');
    const firstSubtaskText = await app.getTaskText(subtasks[0]);
    expect(firstSubtaskText).toContain('Normal 2');

    // Verify it's marked as important
    const isImportant = await app.isTaskImportant('Normal 2');
    expect(isImportant).toBe(true);
  });

  test('9. Nested Subtask Editing', async ({ page }) => {
    await app.addTodayTask('Parent Task');
    await app.addSubtask('Parent Task', 'Original Text');

    // Edit subtask via context menu (uses inline editing)
    await app.longPressTask('Original Text');
    await app.selectContextMenuItem('Edit Task');

    // Wait for inline edit input (use class selector to avoid subtask input)
    const editInput = page.locator('.edit-input');
    await editInput.waitFor({ state: 'visible', timeout: 1000 });
    await editInput.fill('Edited Text');
    await editInput.press('Enter');
    await page.waitForTimeout(200);

    // Verify text updated
    const task = await app.getSubtaskByText('Edited Text');
    expect(task).toBeTruthy();

    // Verify still nested under parent
    const subtasks = await app.getSubtasks('Parent Task');
    expect(subtasks.length).toBe(1);
  });

  test('10. Empty Parent Removal', async () => {
    await app.addTodayTask('Parent C');
    await app.addSubtask('Parent C', 'Subtask 1');
    await app.addSubtask('Parent C', 'Subtask 2');

    // Move first subtask
    await app.clickMoveButton('Subtask 1');

    // Parent should still exist in Today (has one child)
    const parentInTodayBefore = await app.isTaskInList('Parent C', 'today');
    expect(parentInTodayBefore).toBe(true);

    // Move second subtask
    await app.clickMoveButton('Subtask 2');

    // Parent should be removed from Today (no children left)
    const parentInTodayAfter = await app.isTaskInList('Parent C', 'today');
    expect(parentInTodayAfter).toBe(false);

    // Parent should now be in Later
    const parentInLater = await app.isTaskInList('Parent C', 'later');
    expect(parentInLater).toBe(true);

    // Only one parent should exist in Later (count top-level)
    const laterParents = await app.page.locator('#tomorrow-list > .task-item:has-text("Parent C")').all();
    expect(laterParents.length).toBe(1);

    // Both children should be under Later parent
    const laterSubtasks = await app.getSubtasks('Parent C');
    expect(laterSubtasks.length).toBe(2);
  });

  test('11. No Rendering Gap After Subtask Movement', async () => {
    // Reproduce exact scenario from bug report:
    // Parent "jkkjik" in Later with two subtasks, move one to Today
    await app.addLaterTask('jkkjik');
    await app.addSubtask('jkkjik', 'jkkjik');  // First subtask (same name as parent)
    await app.addSubtask('jkkjik', 'hijjkklk');  // Second subtask

    // Add another task below for gap detection
    await app.addLaterTask('ghj');

    // Move first subtask to Today (helper prefers subtasks over parents when both have same name)
    await app.clickMoveButton('jkkjik');
    await app.page.waitForTimeout(300);  // Wait for movement animation

    // Verify parent still exists in Later with one subtask
    const parentInLater = await app.isTaskInList('jkkjik', 'later');
    expect(parentInLater).toBe(true);

    // Count all visible task items in Later list (excluding empty messages)
    const laterTasks = await app.page.locator('#tomorrow-list > .task-item').all();

    // Should have exactly 2 top-level tasks: parent "jkkjik" and "ghj"
    expect(laterTasks.length).toBe(2);

    // Verify no empty or hidden elements causing gaps
    for (const task of laterTasks) {
      const text = await task.textContent();
      expect(text.trim()).not.toBe('');  // No empty tasks
      const isVisible = await task.isVisible();
      expect(isVisible).toBe(true);  // All should be visible
    }

    // Verify subtasks under parent
    const remainingSubtasks = await app.getSubtasks('jkkjik');
    expect(remainingSubtasks.length).toBe(1);  // Only "hijjkklk" should remain

    // Verify the moved subtask is now in Today under the parent
    const parentInToday = await app.isTaskInList('jkkjik', 'today');
    expect(parentInToday).toBe(true);  // Parent should be copied to Today
  });

  test('12. Real DOM Click Completion (Regression for CSS pointer-events bug)', async () => {
    // REGRESSION TEST: User reported subtasks can't be clicked in production
    // Root cause: .task-content div intercepts pointer events before reaching .task-item
    // Tests previously passed because they used {force: true} or JavaScript API
    //
    // This test validates REAL DOM clicking behavior (no force, no JS API)
    // Uses JavaScript API to CREATE tasks, but tests REAL DOM clicks for completion

    // Setup: Create parent with 2 subtasks via JavaScript API (bypassing UI complexity)
    await app.page.evaluate(() => {
      const parent = app.taskManager.addTask('Click Test Parent', 'today');
      // addTask returns the task object, so we get the ID from it
      app.taskManager.addTask('Click Subtask 1', 'today', parent.id);
      app.taskManager.addTask('Click Subtask 2', 'today', parent.id);
    });
    await app.page.waitForTimeout(200);

    // Verify initial state - neither subtask is completed
    const subtask1Before = await app.isTaskCompleted('Click Subtask 1');
    const subtask2Before = await app.isTaskCompleted('Click Subtask 2');
    expect(subtask1Before).toBe(false);
    expect(subtask2Before).toBe(false);

    // Real DOM click on first subtask - click on .task-item directly (where event handler lives)
    // With pointer-events: none on .task-content, clicks pass through to .task-item
    const subtask1 = await app.getSubtaskByText('Click Subtask 1');
    await subtask1.click();  // Click the task-item directly
    await app.page.waitForTimeout(200);

    // Verify first subtask is now completed
    const subtask1After = await app.isTaskCompleted('Click Subtask 1');
    expect(subtask1After).toBe(true);

    // Real DOM click on second subtask
    const subtask2 = await app.getSubtaskByText('Click Subtask 2');
    await subtask2.click();  // Click the task-item directly
    await app.page.waitForTimeout(200);

    // Verify second subtask is now completed
    const subtask2After = await app.isTaskCompleted('Click Subtask 2');
    expect(subtask2After).toBe(true);

    // Also test parent task real DOM clicking
    const parent = await app.getTaskByText('Click Test Parent');
    await parent.click();  // Click the task-item directly
    await app.page.waitForTimeout(200);

    // Parent was auto-completed, this click toggles it incomplete
    const parentAfterClick = await app.isTaskCompleted('Click Test Parent');
    expect(parentAfterClick).toBe(false);
  });

  test('13. Cross-List Parent - findNodeById and getTaskList Correctness', async () => {
    // REGRESSION TEST: When a parent exists in BOTH lists (v3 invariant),
    // findNodeById and getTaskList should return correct info based on context.
    //
    // Bug: findNodeById returns first match (today) ignoring tomorrow's node.
    // Bug: getTaskList returns 'today' even when queried about tomorrow's instance.

    // Setup: Create parent with 2 subtasks in Today
    await app.addTodayTask('Cross List Parent');
    await app.addSubtask('Cross List Parent', 'Subtask Stay Today');
    await app.addSubtask('Cross List Parent', 'Subtask Move Later');

    // Move one subtask to Later (this triggers v3 invariant - parent gets copied to Later)
    await app.clickMoveButton('Subtask Move Later');
    await app.page.waitForTimeout(300);

    // Verify parent exists in BOTH lists (v3 invariant working)
    const parentInToday = await app.isTaskInList('Cross List Parent', 'today');
    const parentInLater = await app.isTaskInList('Cross List Parent', 'later');
    expect(parentInToday).toBe(true);
    expect(parentInLater).toBe(true);

    // Test: Verify the task exists in BOTH flat arrays
    const bothArraysHaveParent = await app.page.evaluate(() => {
      const inToday = app.data.today.some(t => t.text === 'Cross List Parent');
      const inTomorrow = app.data.tomorrow.some(t => t.text === 'Cross List Parent');
      return { inToday, inTomorrow };
    });
    expect(bothArraysHaveParent.inToday).toBe(true);
    expect(bothArraysHaveParent.inTomorrow).toBe(true);

    // Test: Verify the parent exists in BOTH trees
    const bothTreesHaveParent = await app.page.evaluate(() => {
      const parentInTodayTree = app.taskManager.trees.today.getAllTasks().some(n => n.text === 'Cross List Parent');
      const parentInTomorrowTree = app.taskManager.trees.tomorrow.getAllTasks().some(n => n.text === 'Cross List Parent');
      return { parentInTodayTree, parentInTomorrowTree };
    });
    expect(bothTreesHaveParent.parentInTodayTree).toBe(true);
    expect(bothTreesHaveParent.parentInTomorrowTree).toBe(true);

    // Test: findNodeById should find the node (currently returns first match - today)
    // This test documents current behavior; the fix should make both trees accessible
    const nodeFound = await app.page.evaluate(() => {
      const parent = app.data.today.find(t => t.text === 'Cross List Parent');
      const node = app.taskManager.findNodeById(parent.id);
      return node !== null;
    });
    expect(nodeFound).toBe(true);

    // Test: getTaskList returns which list(s) contain the task
    // BUG EXPOSED: getTaskList returns only 'today', missing 'tomorrow'
    const taskListResult = await app.page.evaluate(() => {
      const parent = app.data.today.find(t => t.text === 'Cross List Parent');
      return app.taskManager.getTaskList(parent.id);
    });
    // Current buggy behavior: returns 'today' only
    // After fix: This test documents that we need list-aware lookups
    expect(taskListResult).toBe('today'); // Documents current behavior

    // Test: Both tree nodes should have correct children for their list
    const childrenPerTree = await app.page.evaluate(() => {
      const parent = app.data.today.find(t => t.text === 'Cross List Parent');
      const todayNode = app.taskManager.trees.today.findById(parent.id);
      const tomorrowNode = app.taskManager.trees.tomorrow.findById(parent.id);
      return {
        todayChildCount: todayNode ? todayNode.children.length : 0,
        tomorrowChildCount: tomorrowNode ? tomorrowNode.children.length : 0
      };
    });
    expect(childrenPerTree.todayChildCount).toBe(1); // 'Subtask Stay Today'
    expect(childrenPerTree.tomorrowChildCount).toBe(1); // 'Subtask Move Later'
  });

  test('14. Cross-List Parent - Delete Mode Uses Correct List Context', async () => {
    // REGRESSION TEST: When delete mode is active GLOBALLY,
    // clicking on a cross-list parent in Later should delete from that list only.
    //
    // v1.28.5: Delete mode is now global (not per-list).
    // Clicking any delete toggle activates delete mode everywhere.

    // Setup: Create parent with children split across lists
    await app.addTodayTask('Delete Test Parent');
    await app.addSubtask('Delete Test Parent', 'Subtask A');
    await app.addSubtask('Delete Test Parent', 'Subtask B');

    // Move Subtask B to Later (parent now in both lists)
    await app.clickMoveButton('Subtask B');
    await app.page.waitForTimeout(300);

    // Verify setup: parent in both lists
    const parentInBoth = await app.page.evaluate(() => {
      const inToday = app.data.today.some(t => t.text === 'Delete Test Parent');
      const inTomorrow = app.data.tomorrow.some(t => t.text === 'Delete Test Parent');
      return inToday && inTomorrow;
    });
    expect(parentInBoth).toBe(true);

    // Enable delete mode globally (via Later button)
    await app.page.click('.delete-mode-toggle[data-list="tomorrow"]');
    await app.page.waitForTimeout(100);

    // Verify delete mode is global (v1.28.5+)
    const isDeleteModeActive = await app.page.evaluate(() => app.deleteMode === true);
    expect(isDeleteModeActive).toBe(true);

    // Get the parent's instance in the LATER list (not Today)
    const laterParent = await app.page.locator('#tomorrow-list > .task-item:not(.subtask-item)').filter({ hasText: 'Delete Test Parent' }).first();

    // Clear any stale wasLongPress flag from previous interactions (test isolation)
    await app.page.evaluate(() => {
      app.wasLongPress = false;
    });

    // Click at the TOP of the parent element (position: {x: 50, y: 10}) to avoid subtasks below
    await laterParent.click({ position: { x: 50, y: 10 } });
    await app.page.waitForTimeout(300);

    // With global delete mode: clicking parent in Later should delete from Later list
    // (using DOM context to determine which list was clicked)

    // After the click, check if parent was deleted from Later
    const parentStillInLater = await app.isTaskInList('Delete Test Parent', 'later');

    // Parent should be deleted from Later (delete mode is ON globally)
    expect(parentStillInLater).toBe(false);

    // Parent should still exist in Today (only clicked in Later list context)
    const parentStillInToday = await app.isTaskInList('Delete Test Parent', 'today');
    expect(parentStillInToday).toBe(true);
  });
});
