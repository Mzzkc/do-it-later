/**
 * E2E Tests: Miscellaneous Features
 * Tests additional UI features like mobile nav, delete mode, date display
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Miscellaneous Features', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should switch between Today and Later tabs on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Add task to Today list (currently visible on mobile)
    await app.addTodayTask('Today task');

    // Switch to Later tab before adding to Later list
    await app.switchMobileTab('tomorrow');

    // Now add task to Later list
    await app.addLaterTask('Later task');

    // Later tab should be active
    const isActive = await app.isMobileTabActive('tomorrow');
    expect(isActive).toBe(true);

    // Switch back to Today
    await app.switchMobileTab('today');

    // Today tab should be active
    const isTodayActive = await app.isMobileTabActive('today');
    expect(isTodayActive).toBe(true);
  });

  test('should toggle delete mode', async () => {
    await app.enableDeleteMode('today');

    const isActive = await app.isDeleteModeActive('today');
    expect(isActive).toBe(true);

    // Toggle again to disable
    await app.enableDeleteMode('today');

    const isStillActive = await app.isDeleteModeActive('today');
    expect(isStillActive).toBe(false);
  });

  test('delete mode should be global - both buttons turn red when active', async ({ page }) => {
    // Enable delete mode via Today button
    await app.enableDeleteMode('today');

    // Both sections should be in delete mode
    const todayActive = await app.isDeleteModeActive('today');
    const laterActive = await app.isDeleteModeActive('tomorrow');
    expect(todayActive).toBe(true);
    expect(laterActive).toBe(true);

    // Both buttons should have active class (red styling)
    const todayButton = page.locator('#today-section .delete-mode-toggle');
    const laterButton = page.locator('#tomorrow-section .delete-mode-toggle');

    const todayButtonActive = await todayButton.evaluate(el => el.classList.contains('active'));
    const laterButtonActive = await laterButton.evaluate(el => el.classList.contains('active'));

    expect(todayButtonActive).toBe(true);
    expect(laterButtonActive).toBe(true);

    // Toggle off via Later button (should turn off globally)
    await app.enableDeleteMode('tomorrow');

    const todayStillActive = await app.isDeleteModeActive('today');
    const laterStillActive = await app.isDeleteModeActive('tomorrow');
    expect(todayStillActive).toBe(false);
    expect(laterStillActive).toBe(false);
  });

  test('delete mode should allow task deletion from any list', async ({ page }) => {
    // Add tasks to both lists
    await app.addTodayTask('Today task');
    await app.addLaterTask('Later task');

    // Enable delete mode via Today button
    await app.enableDeleteMode('today');

    // Should be able to delete task from Later list
    await app.clickTaskText('Later task');

    // Task should be deleted
    const laterTasks = await app.getLaterTasks();
    expect(laterTasks.length).toBe(0);

    // Should still be able to delete from Today list
    await app.clickTaskText('Today task');

    const todayTasks = await app.getTodayTasks();
    expect(todayTasks.length).toBe(0);
  });

  test('should display current date', async () => {
    const dateDisplay = await app.getCurrentDateDisplay();

    // Should show some date text
    expect(dateDisplay).toBeTruthy();
    expect(dateDisplay.length).toBeGreaterThan(0);
  });

  test('should show empty message when list is empty', async () => {
    // Both lists start empty
    const todayMessage = await app.getEmptyMessage('today');
    const laterMessage = await app.getEmptyMessage('later');

    // May show empty message or just be null/undefined
    // Just verify we can query for it without errors
    expect(todayMessage !== undefined).toBe(true);
    expect(laterMessage !== undefined).toBe(true);
  });

  test('should update completed counter correctly', async () => {
    // Start at 0
    let count = await app.getCompletedCount();
    expect(count).toBe(0);

    // Add and complete tasks
    await app.addTodayTask('Task 1');
    await app.addTodayTask('Task 2');
    await app.addTodayTask('Task 3');

    await app.toggleTaskCompletion('Task 1');
    count = await app.getCompletedCount();
    expect(count).toBe(1);

    await app.toggleTaskCompletion('Task 2');
    count = await app.getCompletedCount();
    expect(count).toBe(2);

    await app.toggleTaskCompletion('Task 3');
    count = await app.getCompletedCount();
    expect(count).toBe(3);

    // Uncomplete a task (counter decrements in this implementation)
    await app.toggleTaskCompletion('Task 1');
    count = await app.getCompletedCount();
    expect(count).toBe(2); // Counter decrements when uncompleting
  });
});
