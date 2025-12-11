/**
 * E2E Tests: Mobile Gestures
 * Tests swipe and long-press interactions
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Mobile Gestures', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should move task with swipe left (Today → Later)', async () => {
    await app.addTodayTask('Swipe left task');

    await app.swipeTask('Swipe left task', 'left');

    // Task should move to Later
    const todayTasks = await app.getTodayTasks();
    const laterTasks = await app.getLaterTasks();

    expect(todayTasks.length).toBe(0);
    expect(laterTasks.length).toBe(1);
  });

  test('should move task with swipe right (Later → Today)', async () => {
    await app.addLaterTask('Swipe right task');

    await app.swipeTask('Swipe right task', 'right');

    // Task should move to Today
    const todayTasks = await app.getTodayTasks();
    const laterTasks = await app.getLaterTasks();

    expect(todayTasks.length).toBe(1);
    expect(laterTasks.length).toBe(0);
  });

  test('should open context menu with long press', async () => {
    await app.addTodayTask('Long press task');

    await app.longPressTask('Long press task');

    // Context menu should appear
    const contextMenu = await app.page.locator('.context-menu');
    expect(await contextMenu.count()).toBeGreaterThan(0);
  });

  test('should show all context menu options', async () => {
    await app.addTodayTask('Menu test');

    await app.longPressTask('Menu test');

    // Check for all menu items using the correct class and text
    const deleteItem = await app.page.locator('.context-menu .context-menu-item:has-text("Delete Task")');
    const importantItem = await app.page.locator('.context-menu .context-menu-item:has-text("Important")');
    const subtaskItem = await app.page.locator('.context-menu .context-menu-item:has-text("Add Subtask")');
    const deadlineItem = await app.page.locator('.context-menu .context-menu-item:has-text("Deadline")');
    const pomodoroItem = await app.page.locator('.context-menu .context-menu-item:has-text("Pomodoro")');

    expect(await deleteItem.count()).toBeGreaterThan(0);
    expect(await importantItem.count()).toBeGreaterThan(0);
    expect(await subtaskItem.count()).toBeGreaterThan(0);
    expect(await deadlineItem.count()).toBeGreaterThan(0);
    expect(await pomodoroItem.count()).toBeGreaterThan(0);
  });

  test('should prevent body scroll when context menu is open', async ({ page }) => {
    // Add multiple tasks to ensure page is scrollable
    for (let i = 1; i <= 10; i++) {
      await app.addTodayTask(`Scroll test task ${i}`);
    }

    // Open context menu via long press
    await app.longPressTask('Scroll test task 1');

    // Verify context menu is visible
    const contextMenu = page.locator('.context-menu');
    await expect(contextMenu).toBeVisible();

    // Check that body has overflow: hidden when menu is open
    const bodyOverflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    expect(bodyOverflow).toBe('hidden');

    // Close menu by clicking backdrop
    await page.locator('.context-menu-backdrop').click();
    await page.waitForTimeout(300);

    // Body overflow should be restored after menu closes
    const bodyOverflowAfter = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    expect(bodyOverflowAfter).not.toBe('hidden');
  });

  test('should prevent text selection on task items (long press bug fix)', async ({ page }) => {
    // Regression test: Long pressing a task should NOT allow text selection
    // Bug: Text in greyed-out area behind context menu was becoming selectable
    await app.addTodayTask('Text selection test');

    // Check that task text has user-select: none
    const taskTextUserSelect = await page.evaluate(() => {
      const taskText = document.querySelector('.task-text');
      if (!taskText) return 'element-not-found';
      return window.getComputedStyle(taskText).userSelect;
    });
    expect(taskTextUserSelect).toBe('none');

    // Also verify task-item itself has user-select: none
    const taskItemUserSelect = await page.evaluate(() => {
      const taskItem = document.querySelector('.task-item');
      if (!taskItem) return 'element-not-found';
      return window.getComputedStyle(taskItem).userSelect;
    });
    expect(taskItemUserSelect).toBe('none');
  });
});
