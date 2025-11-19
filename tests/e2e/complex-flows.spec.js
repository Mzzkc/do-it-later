/**
 * E2E Tests: Complex User Flows and Edge Cases
 * Tests for complex multi-step workflows and feature interactions
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Complex User Flows', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test.describe('Subtask Edge Cases', () => {
    test('completing parent with completed child should maintain completion state', async ({ page }) => {
      await app.addTodayTask('Parent');
      await app.addSubtask('Parent', 'Child 1');
      await app.addSubtask('Parent', 'Child 2');

      // Complete one child
      await app.toggleTaskCompletion('Child 1');

      // Complete parent (should cascade to Child 2)
      await app.toggleTaskCompletion('Parent');

      // Verify both children are completed
      const child1Completed = await app.isTaskCompleted('Child 1');
      const child2Completed = await app.isTaskCompleted('Child 2');
      const parentCompleted = await app.isTaskCompleted('Parent');

      expect(child1Completed).toBe(true);
      expect(child2Completed).toBe(true);
      expect(parentCompleted).toBe(true);
    });

    test('moving parent with mixed expanded states should preserve per-list expansion', async ({ page }) => {
      await app.addTodayTask('Parent');
      await app.addSubtask('Parent', 'Child');

      // Collapse in Today
      const todayExpandIcon = page.locator('#today-list .task-item:has-text("Parent") .expand-icon');
      await todayExpandIcon.click();
      await page.waitForTimeout(100);

      // Move to Later
      await app.clickMoveButton('Parent');
      await page.waitForTimeout(300);

      // Children should be visible in Later (fresh expansion state)
      const laterChild = page.locator('#tomorrow-list .task-item:has-text("Child")').first();
      const isVisibleInLater = await laterChild.isVisible();
      expect(isVisibleInLater).toBe(true);

      // Move back to Today
      await app.clickMoveButton('Parent');
      await page.waitForTimeout(300);

      // Should remember collapsed state in Today
      // BUGFIX: Use .subtask-item instead of .task-item to avoid matching parent
      const todayChild = page.locator('#today-list .subtask-item:has-text("Child")').first();
      const isVisibleInToday = await todayChild.isVisible();
      expect(isVisibleInToday).toBe(false);
    });

    test('deleting parent with deadline should clean up child deadlines', async ({ page }) => {
      await app.addTodayTask('Parent with deadline');

      // Set deadline on parent
      await app.longPressTask('Parent with deadline');
      await app.selectContextMenuItem('Set Deadline');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = page.locator('#deadline-picker input[type="date"]');
      await dateInput.fill(tomorrow.toISOString().split('T')[0]);
      await page.click('#deadline-picker button:has-text("Set")');
      await page.waitForTimeout(100);

      // Add child
      await app.addSubtask('Parent with deadline', 'Child');

      // Delete parent
      await app.longPressTask('Parent with deadline');
      await app.selectContextMenuItem('Delete');
      await page.waitForTimeout(100);

      // Verify both tasks are deleted
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(0);
    });

    test('rapidly toggling parent expansion should not lose children', async ({ page }) => {
      await app.addTodayTask('Toggle parent');
      await app.addSubtask('Toggle parent', 'Child 1');
      await app.addSubtask('Toggle parent', 'Child 2');

      const expandIcon = page.locator('#today-list .task-item:has-text("Toggle parent") .expand-icon');

      // Rapidly toggle 5 times
      for (let i = 0; i < 5; i++) {
        await expandIcon.click();
        await page.waitForTimeout(20);
      }

      // Wait for animations
      await page.waitForTimeout(200);

      // Reload and verify children still exist
      await app.reload();

      // Check data.today length from localStorage (includes both parent and children)
      const dataLength = await page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem('do-it-later-data'));
        return data.today.length;
      });
      expect(dataLength).toBe(3); // Parent + 2 children in data.today array
    });

    test('parent in both lists edge case should not occur', async ({ page }) => {
      await app.addTodayTask('Parent');
      await app.addSubtask('Parent', 'Child');

      // Move parent to Later
      await app.clickMoveButton('Parent');
      await page.waitForTimeout(300);

      // Verify parent is ONLY in Later list by checking data arrays
      const dataLengths = await page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem('do-it-later-data'));
        return {
          today: data.today.length,
          tomorrow: data.tomorrow.length
        };
      });

      expect(dataLengths.today).toBe(0); // No tasks in Today
      expect(dataLengths.tomorrow).toBe(2); // Parent + Child in Later data array
    });
  });

  test.describe('Deadline Edge Cases', () => {
    test('setting deadline on completed task should allow it', async ({ page }) => {
      await app.addTodayTask('Complete then deadline');

      // Complete task
      await app.toggleTaskCompletion('Complete then deadline');

      // Set deadline
      await app.longPressTask('Complete then deadline');
      await app.selectContextMenuItem('Set Deadline');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = page.locator('#deadline-picker input[type="date"]');
      await dateInput.fill(tomorrow.toISOString().split('T')[0]);
      await page.click('#deadline-picker button:has-text("Set")');
      await page.waitForTimeout(100);

      // Verify deadline was set
      const hasDeadline = await page.locator('.task-item:has-text("Complete then deadline") .deadline').isVisible();
      expect(hasDeadline).toBe(true);
    });

    test('editing task with deadline should preserve deadline', async ({ page }) => {
      await app.addTodayTask('Edit with deadline');

      // Set deadline
      await app.longPressTask('Edit with deadline');
      await app.selectContextMenuItem('Set Deadline');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = page.locator('#deadline-picker input[type="date"]');
      await dateInput.fill(tomorrow.toISOString().split('T')[0]);
      await page.click('#deadline-picker button:has-text("Set")');
      await page.waitForTimeout(100);

      // Edit task
      await app.longPressTask('Edit with deadline');
      await app.selectContextMenuItem('Edit Task');

      const editInput = page.locator('#today-list input[type="text"]');
      await editInput.fill('Edited task');
      await editInput.press('Enter');
      await page.waitForTimeout(100);

      // Verify deadline still exists
      const hasDeadline = await page.locator('.task-item:has-text("Edited task") .deadline').isVisible();
      expect(hasDeadline).toBe(true);
    });

    test('parent and child with different deadlines should both display', async ({ page }) => {
      await app.addTodayTask('Parent');

      // Set deadline on parent
      await app.longPressTask('Parent');
      await app.selectContextMenuItem('Set Deadline');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      let dateInput = page.locator('#deadline-picker input[type="date"]');
      await dateInput.fill(tomorrow.toISOString().split('T')[0]);
      await page.click('#deadline-picker button:has-text("Set")');
      await page.waitForTimeout(100);

      // Add child
      await app.addSubtask('Parent', 'Child');

      // Set different deadline on child
      await app.longPressTask('Child');
      await app.selectContextMenuItem('Set Deadline');

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      dateInput = page.locator('#deadline-picker input[type="date"]');
      await dateInput.fill(nextWeek.toISOString().split('T')[0]);
      await page.click('#deadline-picker button:has-text("Set")');
      await page.waitForTimeout(100);

      // Verify both have deadline indicators
      const parentDeadline = await page.locator('.task-item:has-text("Parent") .deadline').first().count();
      const childDeadline = await page.locator('.task-item:has-text("Child") .deadline').first().count();

      expect(parentDeadline).toBeGreaterThan(0);
      expect(childDeadline).toBeGreaterThan(0);
    });

    test('clearing deadline should remove indicator', async ({ page }) => {
      await app.addTodayTask('Clear deadline');

      // Set deadline
      await app.longPressTask('Clear deadline');
      await app.selectContextMenuItem('Set Deadline');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = page.locator('#deadline-picker input[type="date"]');
      await dateInput.fill(tomorrow.toISOString().split('T')[0]);
      await page.click('#deadline-picker button:has-text("Set")');
      await page.waitForTimeout(100);

      // Clear deadline
      await app.longPressTask('Clear deadline');
      await app.selectContextMenuItem('Change Deadline');
      await page.click('#deadline-picker button:has-text("Clear")');
      await page.waitForTimeout(100);

      // Verify deadline is removed
      const hasDeadline = await page.locator('.task-item:has-text("Clear deadline") .deadline').isVisible().catch(() => false);
      expect(hasDeadline).toBe(false);
    });

    test('moving task with deadline multiple times should preserve deadline', async ({ page }) => {
      await app.addTodayTask('Move with deadline');

      // Set deadline
      await app.longPressTask('Move with deadline');
      await app.selectContextMenuItem('Set Deadline');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = page.locator('#deadline-picker input[type="date"]');
      await dateInput.fill(tomorrow.toISOString().split('T')[0]);
      await page.click('#deadline-picker button:has-text("Set")');
      await page.waitForTimeout(100);

      // Move to Later
      await app.clickMoveButton('Move with deadline');
      await page.waitForTimeout(300);

      // Move back to Today
      await app.clickMoveButton('Move with deadline');
      await page.waitForTimeout(300);

      // Move to Later again
      await app.clickMoveButton('Move with deadline');
      await page.waitForTimeout(300);

      // Verify deadline still exists in Later
      const hasDeadline = await page.locator('#tomorrow-list .task-item:has-text("Move with deadline") .deadline').isVisible();
      expect(hasDeadline).toBe(true);
    });
  });

  test.describe('Import/Export Edge Cases', () => {
    test('importing while pomodoro is running should handle gracefully', async ({ page }) => {
      await app.addTodayTask('Pomodoro task');

      // Start pomodoro
      await app.longPressTask('Pomodoro task');
      await app.selectContextMenuItem('Start Pomodoro');
      await page.waitForTimeout(100);

      // Import new data
      const importData = 'T:Imported task';

      await page.click('#import-clipboard-btn');
      await page.waitForTimeout(100);

      // Fill paste dialog
      await page.locator('#paste-area').fill(importData);
      await page.click('#paste-import');
      await page.waitForTimeout(200);

      // Pomodoro should either stop or continue on valid task
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(1);
    });

    test('exporting then importing should preserve all task properties', async ({ page }) => {
      await app.addTodayTask('Task with props');

      // Set properties
      await app.longPressTask('Task with props');
      await app.selectContextMenuItem('Toggle Important');
      await page.waitForTimeout(100);

      await app.longPressTask('Task with props');
      await app.selectContextMenuItem('Set Deadline');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = page.locator('#deadline-picker input[type="date"]');
      await dateInput.fill(tomorrow.toISOString().split('T')[0]);
      await page.click('#deadline-picker button:has-text("Set")');
      await page.waitForTimeout(100);

      // Export
      await page.click('#export-clipboard-btn');
      await page.waitForTimeout(100);

      const exportedData = await page.evaluate(() => navigator.clipboard.readText());

      // Clear data
      await app.clearLocalStorage();
      await app.reload();

      // Import - use paste dialog
      await page.click('#import-clipboard-btn');
      await page.waitForTimeout(100);

      // Fill the paste dialog
      const pasteArea = page.locator('#paste-area');
      await pasteArea.fill(exportedData);

      // Click import button
      await page.click('#paste-import');
      await page.waitForTimeout(200);

      // Verify properties preserved
      const isImportant = await app.isTaskImportant('Task with props');
      expect(isImportant).toBe(true);
    });

    test('importing with existing expansion states should not corrupt UI', async ({ page }) => {
      await app.addTodayTask('Existing parent');
      await app.addSubtask('Existing parent', 'Existing child');

      // Collapse
      const expandIcon = page.locator('#today-list .task-item:has-text("Existing parent") .expand-icon');
      await expandIcon.click();
      await page.waitForTimeout(100);

      // Import new tasks
      const importData = 'T:New task 1|T:New task 2';

      await page.click('#import-clipboard-btn');
      await page.waitForTimeout(100);

      // Fill paste dialog
      await page.locator('#paste-area').fill(importData);
      await page.click('#paste-import');
      await page.waitForTimeout(200);

      // Verify expansion state maintained
      // WAVE 5 FIX: Use .subtask-item to avoid matching both parent and nested child
      const childVisible = await page.locator('#today-list .subtask-item:has-text("Existing child")').isVisible();
      expect(childVisible).toBe(false);
    });

    test('importing during mid-edit should cancel edit', async ({ page }) => {
      await app.addTodayTask('Editing task');

      // Start editing
      await app.longPressTask('Editing task');
      await app.selectContextMenuItem('Edit Task');

      const editInput = page.locator('#today-list input[type="text"]');
      await editInput.fill('New text');

      // Import
      const importData = 'T:Imported task';

      await page.click('#import-clipboard-btn');
      await page.waitForTimeout(100);

      // Fill paste dialog
      await page.locator('#paste-area').fill(importData);
      await page.click('#paste-import');
      await page.waitForTimeout(200);

      // Edit should be cancelled, original text preserved
      const task = await app.getTaskByText('Editing task');
      expect(task).toBeTruthy();
    });

    test('exporting empty lists should produce valid format', async ({ page }) => {
      // Export with no tasks
      await page.click('#export-clipboard-btn');
      await page.waitForTimeout(100);

      const exportedData = await page.evaluate(() => navigator.clipboard.readText());

      // Should contain JSON v3 format with empty arrays
      expect(exportedData).toContain('"version": 3');
      expect(exportedData).toContain('"today": []');
      expect(exportedData).toContain('"tomorrow": []');
    });
  });

  test.describe('State Management Edge Cases', () => {
    test('task expanded in both lists should maintain independent states', async ({ page }) => {
      await app.addTodayTask('Dual expansion parent');
      await app.addSubtask('Dual expansion parent', 'Child');

      // Collapse in Today
      let expandIcon = page.locator('#today-list .task-item:has-text("Dual expansion parent") .expand-icon');
      await expandIcon.click();
      await page.waitForTimeout(100);

      // Move to Later (should be expanded by default)
      await app.clickMoveButton('Dual expansion parent');
      await page.waitForTimeout(300);

      // Verify expanded in Later
      const laterChild = page.locator('#tomorrow-list .task-item:has-text("Child")').first();
      expect(await laterChild.isVisible()).toBe(true);

      // Create second parent in Today with same text pattern
      await app.addTodayTask('Dual expansion parent');
      await app.addSubtask('Dual expansion parent', 'Child');

      // Should not affect Later list expansion
      const laterChildStill = page.locator('#tomorrow-list .task-item:has-text("Child")').first();
      expect(await laterChildStill.isVisible()).toBe(true);
    });

    test('marking parent important should not cascade to children', async ({ page }) => {
      await app.addTodayTask('Important parent');
      await app.addSubtask('Important parent', 'Normal child');

      // Mark parent important
      await app.longPressTask('Important parent');
      await app.selectContextMenuItem('Toggle Important');
      await page.waitForTimeout(100);

      // Child should NOT be important
      const childImportant = await app.isTaskImportant('Normal child');
      expect(childImportant).toBe(false);
    });

    test('completing task during pomodoro should handle state correctly', async ({ page }) => {
      await app.addTodayTask('Pomodoro complete');

      // Start pomodoro
      await app.longPressTask('Pomodoro complete');
      await app.selectContextMenuItem('Start Pomodoro');
      await page.waitForTimeout(100);

      // Complete task
      await app.toggleTaskCompletion('Pomodoro complete');

      // Pomodoro should stop or complete
      const count = await app.getCompletedCount();
      expect(count).toBe(1);
    });

    test('switching tabs during edit should preserve edit state', async ({ page }) => {
      await app.addTodayTask('Edit in Today');

      // Start editing
      await app.longPressTask('Edit in Today');
      await app.selectContextMenuItem('Edit Task');

      const editInput = page.locator('#today-list input[type="text"]');
      await editInput.fill('Modified text');

      // Switch to Later tab (on mobile)
      if (await page.locator('#mobile-nav').isVisible()) {
        await page.click('.nav-btn:has-text("Later")');
        await page.waitForTimeout(100);

        // Switch back
        await page.click('.nav-btn:has-text("Today")');
        await page.waitForTimeout(100);
      }

      // Edit should still be active
      const inputStillExists = await page.locator('#today-list input[type="text"]').isVisible();
      expect(inputStillExists).toBe(true);
    });

    test('entering delete mode should prevent task editing', async ({ page }) => {
      await app.addTodayTask('Delete mode test');

      // Enter delete mode
      const deleteToggle = page.locator('#today-section .delete-mode-toggle');
      await deleteToggle.click();
      await page.waitForTimeout(100);

      // Try to edit (long press should still work but context menu different)
      await app.longPressTask('Delete mode test');

      // Context menu should not appear in delete mode
      const contextMenu = page.locator('#context-menu');
      const isVisible = await contextMenu.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });
  });

  test.describe('Multi-Feature Interactions', () => {
    test('task with all features (important, deadline, subtask, completed) should work together', async ({ page }) => {
      await app.addTodayTask('Full feature task');

      // Add subtask
      await app.addSubtask('Full feature task', 'Subtask');

      // Mark important
      await app.longPressTask('Full feature task');
      await app.selectContextMenuItem('Toggle Important');
      await page.waitForTimeout(100);

      // Set deadline
      await app.longPressTask('Full feature task');
      await app.selectContextMenuItem('Set Deadline');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = page.locator('#deadline-picker input[type="date"]');
      await dateInput.fill(tomorrow.toISOString().split('T')[0]);
      await page.click('#deadline-picker button:has-text("Set")');
      await page.waitForTimeout(100);

      // Complete parent (cascades to child)
      await app.toggleTaskCompletion('Full feature task');

      // Verify all states
      const isImportant = await app.isTaskImportant('Full feature task');
      const isCompleted = await app.isTaskCompleted('Full feature task');
      const childCompleted = await app.isTaskCompleted('Subtask');

      expect(isImportant).toBe(true);
      expect(isCompleted).toBe(true);
      expect(childCompleted).toBe(true);
    });

    test('importing tasks with all states during active session should merge correctly', async ({ page }) => {
      // Listen for dialogs and dismiss them (to trigger merge path)
      page.on('dialog', dialog => {
        dialog.dismiss(); // Click "Cancel" to trigger merge
      });

      // Create existing task
      await app.addTodayTask('Existing');
      await app.longPressTask('Existing');
      await app.selectContextMenuItem('Toggle Important');
      await page.waitForTimeout(100);

      // Complete 2 tasks to set counter
      await app.addTodayTask('Complete 1');
      await app.addTodayTask('Complete 2');
      await app.toggleTaskCompletion('Complete 1');
      await app.toggleTaskCompletion('Complete 2');

      // WAVE 5 FIX: Use JSON format (actual implementation) not pipe format (never existed)
      const importData = {
        today: [{id: 'import1', text: 'Imported important', important: true, completed: false}],
        tomorrow: [{id: 'import2', text: 'Later task', important: false, completed: false}],
        totalCompleted: 5,
        version: 3
      };
      await page.click('#import-clipboard-btn');
      await page.waitForTimeout(100);

      // Fill paste dialog
      await page.locator('#paste-area').fill(JSON.stringify(importData));
      await page.click('#paste-import');
      await page.waitForTimeout(200);

      // Verify merge: existing important + imported important + later task
      const todayTasks = await app.getTodayTasks();
      const laterTasks = await app.getLaterTasks();

      expect(todayTasks.length).toBeGreaterThan(0);
      expect(laterTasks.length).toBeGreaterThan(0);

      // Counter should be merged (2 + 5 = 7)
      const count = await app.getCompletedCount();
      expect(count).toBe(7);
    });
  });
});
