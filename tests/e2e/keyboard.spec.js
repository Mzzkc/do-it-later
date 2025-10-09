/**
 * E2E Tests: Keyboard Shortcuts
 * Tests keyboard interactions for task management
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Keyboard Shortcuts', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should add task with Enter in Today list', async () => {
    await app.typeInInput('today', 'New today task');
    await app.pressKeyInInput('today', 'Enter');

    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(1);

    const taskText = await app.getTaskText(tasks[0]);
    expect(taskText).toContain('New today task');
  });

  test('should add task with Enter in Later list', async () => {
    await app.typeInInput('later', 'New later task');
    await app.pressKeyInInput('later', 'Enter');

    const tasks = await app.getLaterTasks();
    expect(tasks.length).toBe(1);

    const taskText = await app.getTaskText(tasks[0]);
    expect(taskText).toContain('New later task');
  });

  test('should complete task with click', async () => {
    await app.addTodayTask('Task to complete');

    // Click should complete the task
    await app.clickTaskText('Task to complete');

    // Task should be marked as completed
    const isCompleted = await app.isTaskCompleted('Task to complete');
    expect(isCompleted).toBe(true);
  });
});
