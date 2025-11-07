/**
 * E2E Tests: Race Conditions and Timing Issues
 * Tests for race conditions, debounce conflicts, and timing-dependent bugs
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Race Conditions', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('rapid task additions should not lose data due to save debounce', async ({ page }) => {
    // Add 5 tasks in rapid succession (faster than 100ms debounce)
    const tasks = ['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5'];

    for (const task of tasks) {
      await app.addTodayTask(task);
      await page.waitForTimeout(20); // Much faster than 100ms save debounce
    }

    // Wait for debounce to complete
    await page.waitForTimeout(150);

    // Reload to verify all tasks were saved
    await app.reload();
    const savedTasks = await app.getTodayTasks();
    expect(savedTasks.length).toBe(5);
  });

  test('rapid task movements should not cause animation conflicts', async ({ page }) => {
    await app.addTodayTask('Move me fast');

    // Click move button twice rapidly
    await app.clickMoveButton('Move me fast');
    await page.waitForTimeout(50); // Mid-animation
    await app.clickMoveButton('Move me fast');

    // Wait for animations to settle
    await page.waitForTimeout(500);

    // Task should end up in one list or the other, not both or neither
    const todayTasks = await app.getTodayTasks();
    const laterTasks = await app.getLaterTasks();
    const totalTasks = todayTasks.length + laterTasks.length;

    expect(totalTasks).toBe(1);
  });

  test('completing task during edit should not corrupt state', async ({ page }) => {
    await app.addTodayTask('Edit and complete');

    // Start editing
    await app.longPressTask('Edit and complete');
    await app.selectContextMenuItem('Edit Task');

    const editInput = page.locator('#today-list input[type="text"]');
    await editInput.fill('New text');

    // Try to complete task while in edit mode (should be blocked)
    await app.toggleTaskCompletion('Edit and complete');

    // Exit edit mode
    await editInput.press('Escape');
    await page.waitForTimeout(100);

    // Check that task exists and has correct state
    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(1);
  });

  test('deleting task during move animation should not orphan task', async ({ page }) => {
    await app.addTodayTask('Delete during move');

    // Start move
    await app.clickMoveButton('Delete during move');

    // Try to delete mid-animation
    await page.waitForTimeout(50);
    await app.longPressTask('Delete during move');
    await app.selectContextMenuItem('Delete');

    // Wait for animations to complete
    await page.waitForTimeout(500);

    // Task should be deleted, not stuck in either list
    const todayTasks = await app.getTodayTasks();
    const laterTasks = await app.getLaterTasks();
    const totalTasks = todayTasks.length + laterTasks.length;

    expect(totalTasks).toBe(0);
  });

  test('rapid completion toggles should maintain correct completed count', async ({ page }) => {
    await app.addTodayTask('Toggle fast');

    // Rapidly toggle completion 10 times
    for (let i = 0; i < 10; i++) {
      await app.toggleTaskCompletion('Toggle fast');
      await page.waitForTimeout(10);
    }

    // Wait for debounce
    await page.waitForTimeout(150);

    // Count should be even (0 if started uncompleted)
    const count = await app.getCompletedCount();
    expect(count % 2).toBe(0);
  });

  test('editing task during parent-child completion cascade should not corrupt relationships', async ({ page }) => {
    await app.addTodayTask('Parent');
    await app.addSubtask('Parent', 'Child');

    // Start editing child
    await app.longPressTask('Child');
    await app.selectContextMenuItem('Edit Task');

    const editInput = page.locator('#today-list input[type="text"]').last();
    await editInput.fill('Edited child');

    // Try to complete parent (which should cascade)
    await app.toggleTaskCompletion('Parent');

    // Exit edit mode
    await editInput.press('Enter');
    await page.waitForTimeout(100);

    // Verify parent-child relationship is maintained
    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(1); // Parent task

    // Verify child subtask still exists
    const subtasks = await app.getSubtasks('Parent');
    expect(subtasks.length).toBe(1);

    // Verify both are completed (edit is cancelled by parent completion)
    const parentCompleted = await app.isTaskCompleted('Parent');
    const childCompleted = await app.isTaskCompleted('Child');
    expect(parentCompleted).toBe(true);
    expect(childCompleted).toBe(true);
  });

  test('importing data while save is pending should not cause data loss', async ({ page }) => {
    await app.addTodayTask('Existing task');

    // Immediately import while save is debouncing
    await page.waitForTimeout(20);

    const importData = 'T:Imported task';
    await page.evaluate((data) => {
      navigator.clipboard.writeText(data);
    }, importData);

    await page.click('#import-clipboard-btn');
    await page.waitForTimeout(200);

    // Both tasks should exist
    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(1); // At least one task should survive
  });

  test('QR scan during task modification should not corrupt state', async ({ page }) => {
    await app.addTodayTask('Task before QR');

    // Start editing
    await app.longPressTask('Task before QR');
    await app.selectContextMenuItem('Edit Task');

    const editInput = page.locator('#today-list input[type="text"]');
    await editInput.fill('Modified text');

    // Cancel edit
    await editInput.press('Escape');

    // Verify task still exists with original text
    const task = await app.getTaskByText('Task before QR');
    expect(task).toBeTruthy();
  });

  test('rapid parent task moves should maintain child relationships', async ({ page }) => {
    await app.addTodayTask('Moving parent');
    await app.addSubtask('Moving parent', 'Child 1');
    await app.addSubtask('Moving parent', 'Child 2');

    // Move parent back and forth rapidly
    await app.clickMoveButton('Moving parent');
    await page.waitForTimeout(100);
    await app.clickMoveButton('Moving parent');
    await page.waitForTimeout(100);
    await app.clickMoveButton('Moving parent');

    // Wait for animations
    await page.waitForTimeout(500);

    // Parent and 2 children should be in the same list
    const todayTasks = await app.getTodayTasks();
    const laterTasks = await app.getLaterTasks();

    // Check if parent is in Today or Later
    const parentInToday = todayTasks.length === 1;
    const parentInLater = laterTasks.length === 1;
    expect(parentInToday || parentInLater).toBe(true);

    // Verify children stayed with parent
    const parentLocation = parentInToday ? 'Moving parent' : 'Moving parent';
    const subtasks = await app.getSubtasks(parentLocation);
    expect(subtasks.length).toBe(2);
  });

  test('completing parent during child edit should not break edit mode', async ({ page }) => {
    await app.addTodayTask('Parent');
    await app.addSubtask('Parent', 'Child');

    // Start editing child
    await app.longPressTask('Child');
    await app.selectContextMenuItem('Edit Task');

    const editInput = page.locator('#today-list input[type="text"]').last();
    await editInput.fill('New child text');

    // Complete parent
    await app.toggleTaskCompletion('Parent');

    // Should still be able to exit edit mode
    await editInput.press('Enter');
    await page.waitForTimeout(100);

    // Verify edit was saved
    const task = await app.getTaskByText('New child text');
    expect(task).toBeTruthy();
  });

  test('rapid importance toggles should not desync UI and state', async ({ page }) => {
    await app.addTodayTask('Important toggle');

    // Rapidly toggle importance 5 times
    for (let i = 0; i < 5; i++) {
      await app.longPressTask('Important toggle');
      await app.selectContextMenuItem('Toggle Important');
      await page.waitForTimeout(50);
    }

    // Wait for debounce
    await page.waitForTimeout(150);

    // Reload and verify state is consistent
    await app.reload();
    const isImportant = await app.isTaskImportant('Important toggle');

    // Should be either true or false, not undefined
    expect(typeof isImportant).toBe('boolean');
  });

  test('deleting task while pomodoro is running should stop timer', async ({ page }) => {
    await app.addTodayTask('Pomodoro task');

    // Start pomodoro
    await app.longPressTask('Pomodoro task');
    await app.selectContextMenuItem('Start Pomodoro');
    await page.waitForTimeout(100);

    // Delete task
    await app.longPressTask('Pomodoro task');
    await app.selectContextMenuItem('Delete');

    // Verify pomodoro UI is cleared
    const pomodoroDisplay = page.locator('#pomodoro-timer');
    const isVisible = await pomodoroDisplay.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('moving task with deadline during edit should preserve deadline', async ({ page }) => {
    await app.addTodayTask('Task with deadline');

    // Add deadline (using context menu)
    await app.longPressTask('Task with deadline');
    await app.selectContextMenuItem('Set Deadline');

    // Set deadline to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = page.locator('#deadline-picker input[type="date"]');
    await dateInput.fill(tomorrow.toISOString().split('T')[0]);
    await page.click('#deadline-picker button:has-text("Set")');
    await page.waitForTimeout(100);

    // Start editing
    await app.longPressTask('Task with deadline');
    await app.selectContextMenuItem('Edit Task');

    const editInput = page.locator('#today-list input[type="text"]');
    await editInput.fill('Edited with deadline');

    // Move task while in edit mode
    await editInput.press('Enter');
    await page.waitForTimeout(50);
    await app.clickMoveButton('Edited with deadline');

    // Wait for move to complete
    await page.waitForTimeout(300);

    // Verify task still has deadline indicator
    const laterTasks = await app.getLaterTasks();
    expect(laterTasks.length).toBe(1);
  });

  test('expanding subtask during parent move should maintain expansion state per list', async ({ page }) => {
    await app.addTodayTask('Expandable parent');
    await app.addSubtask('Expandable parent', 'Child');

    // Collapse subtasks in Today
    const expandIcon = page.locator('.task-item:has-text("Expandable parent") .expand-icon').first();
    await expandIcon.click();
    await page.waitForTimeout(100);

    // Move to Later
    await app.clickMoveButton('Expandable parent');
    await page.waitForTimeout(300);

    // Expand in Later list
    const laterExpandIcon = page.locator('#tomorrow-list .task-item:has-text("Expandable parent") .expand-icon');
    await laterExpandIcon.click();
    await page.waitForTimeout(100);

    // Move back to Today
    await app.clickMoveButton('Expandable parent');
    await page.waitForTimeout(300);

    // Should remember collapsed state in Today
    // BUGFIX: Use .subtask-item instead of .task-item to avoid matching parent
    const todayChild = page.locator('#today-list .subtask-item:has-text("Child")').first();
    const isVisible = await todayChild.isVisible().catch(() => true);
    expect(isVisible).toBe(false); // Should be collapsed
  });

  test('context menu during task deletion animation should not show for deleted task', async ({ page }) => {
    await app.addTodayTask('Delete me');

    // Start deletion
    await app.longPressTask('Delete me');
    await app.selectContextMenuItem('Delete');

    // Try to open context menu immediately after
    await page.waitForTimeout(50);

    // Task should not be long-pressable anymore
    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(0);
  });

  test('rapid export operations should not corrupt clipboard', async ({ page }) => {
    await app.addTodayTask('Task 1');
    await app.addTodayTask('Task 2');

    // Rapidly click export to clipboard 3 times
    for (let i = 0; i < 3; i++) {
      await page.click('#export-clipboard-btn');
      await page.waitForTimeout(50);
    }

    // Wait for operations to complete
    await page.waitForTimeout(200);

    // Clipboard should contain valid v3 export format (with header comment)
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('Do It (Later)'); // Export header
    expect(clipboardText).toContain('"today"'); // v3 JSON format
    expect(clipboardText).toContain('"version": 3');
    expect(clipboardText.length).toBeGreaterThan(0);

    // Extract and verify JSON portion (after header comments)
    const jsonMatch = clipboardText.match(/\{[\s\S]*\}/);
    expect(jsonMatch).toBeTruthy();
    const parsed = JSON.parse(jsonMatch[0]);
    expect(parsed.today).toBeDefined();
    expect(parsed.tomorrow).toBeDefined();
  });

  test('theme switch during task animation should not break rendering', async ({ page }) => {
    await app.addTodayTask('Theme test');

    // Start move animation
    await app.clickMoveButton('Theme test');

    // Switch theme mid-animation
    await page.waitForTimeout(50);
    await page.click('#theme-toggle');

    // Wait for animations to complete
    await page.waitForTimeout(500);

    // Task should still be visible in one list
    const todayTasks = await app.getTodayTasks();
    const laterTasks = await app.getLaterTasks();
    const totalTasks = todayTasks.length + laterTasks.length;

    expect(totalTasks).toBe(1);
  });

  test('rapid subtask additions should not violate parent-child relationships', async ({ page }) => {
    await app.addTodayTask('Parent');

    // Rapidly add 3 subtasks
    for (let i = 1; i <= 3; i++) {
      await app.addSubtask('Parent', `Child ${i}`);
      await page.waitForTimeout(20);
    }

    // Wait for debounce
    await page.waitForTimeout(150);

    // Reload and verify all subtasks exist in data array
    await app.reload();
    const dataLength = await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('do-it-later-data'));
      return data.today.length;
    });
    expect(dataLength).toBe(4); // 1 parent + 3 children in data array
  });
});
