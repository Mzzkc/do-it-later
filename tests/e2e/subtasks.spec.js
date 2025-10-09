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

    // Parent should auto-complete
    const parentCompleted = await app.isTaskCompleted('Parent Task');
    expect(parentCompleted).toBe(true);

    // Should show notification
    await app.waitForNotification('All subtasks done');
  });

  test('4. Subtask Movement Between Lists', async () => {
    await app.addTodayTask('Parent A');
    await app.addSubtask('Parent A', 'Moving Subtask');

    // Move subtask to Later
    await app.clickMoveButton('Moving Subtask');

    // Verify subtask moved
    const laterTasks = await app.getLaterTasks();
    expect(laterTasks.length).toBeGreaterThan(0);

    // Parent should be copied to Later
    const parentInLater = await app.getTaskByText('Parent A');
    const parentList = await parentInLater.locator('xpath=ancestor::*[@id]').first().getAttribute('id');
    expect(parentList).toBe('later-list');

    // Original parent should be removed from Today (if empty)
    const todayTasks = await app.getTodayTasks();
    const parentInToday = todayTasks.filter(async (task) => {
      const text = await app.getTaskText(task);
      return text.includes('Parent A');
    });
    expect(parentInToday.length).toBe(0);
  });

  test('5. Subtask Movement - Parent Already Exists', async () => {
    // Create Parent B in Today with subtask
    await app.addTodayTask('Parent B');
    await app.addSubtask('Parent B', 'Subtask 1');

    // Manually create Parent B in Later
    await app.addLaterTask('Parent B');

    // Move subtask from Today to Later
    await app.clickMoveButton('Subtask 1');

    // Verify only one Parent B exists in Later
    const laterParents = await app.page.locator('#later-list .task-item:has-text("Parent B")').all();
    expect(laterParents.length).toBe(1);

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

    // Edit subtask
    await app.clickTaskText('Original Text');
    await page.fill('.modal input', 'Edited Text');
    await app.clickModalSave();

    // Verify text updated
    const task = await app.getTaskByText('Edited Text');
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
    const todayTasks = await app.getTodayTasks();
    const parentInToday = todayTasks.filter(async (task) => {
      const text = await app.getTaskText(task);
      return text.includes('Parent C');
    });
    expect(parentInToday.length).toBeGreaterThan(0);

    // Move second subtask
    await app.clickMoveButton('Subtask 2');

    // Parent should be removed from Today
    const todayTasksAfter = await app.getTodayTasks();
    const parentInTodayAfter = todayTasksAfter.filter(async (task) => {
      const text = await app.getTaskText(task);
      return text.includes('Parent C');
    });
    expect(parentInTodayAfter.length).toBe(0);

    // Only one parent should exist in Later
    const laterParents = await app.page.locator('#later-list .task-item:has-text("Parent C")').all();
    expect(laterParents.length).toBe(1);

    // Both children should be under Later parent
    const laterSubtasks = await app.getSubtasks('Parent C');
    expect(laterSubtasks.length).toBe(2);
  });
});
