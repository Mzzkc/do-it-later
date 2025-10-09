/**
 * E2E Tests: Basic Task Operations
 * Tests core task creation, completion, movement, and deletion
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Basic Task Operations', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should add task to Today list', async () => {
    await app.addTodayTask('My first task');
    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(1);

    const taskText = await app.getTaskText(tasks[0]);
    expect(taskText).toContain('My first task');
  });

  test('should add task to Later list', async () => {
    await app.addLaterTask('My later task');
    const tasks = await app.getLaterTasks();
    expect(tasks.length).toBe(1);

    const taskText = await app.getTaskText(tasks[0]);
    expect(taskText).toContain('My later task');
  });

  test('should complete a task', async () => {
    await app.addTodayTask('Task to complete');
    await app.toggleTaskCompletion('Task to complete');

    const isCompleted = await app.isTaskCompleted('Task to complete');
    expect(isCompleted).toBe(true);

    const count = await app.getCompletedCount();
    expect(count).toBe(1);
  });

  test('should uncomplete a task', async () => {
    await app.addTodayTask('Task to uncomplete');
    await app.toggleTaskCompletion('Task to uncomplete');
    await app.toggleTaskCompletion('Task to uncomplete');

    const isCompleted = await app.isTaskCompleted('Task to uncomplete');
    expect(isCompleted).toBe(false);

    const count = await app.getCompletedCount();
    expect(count).toBe(0);
  });

  test('should move task from Today to Later', async () => {
    await app.addTodayTask('Moving task');
    await app.clickMoveButton('Moving task');

    const todayTasks = await app.getTodayTasks();
    const laterTasks = await app.getLaterTasks();

    expect(todayTasks.length).toBe(0);
    expect(laterTasks.length).toBe(1);

    const taskText = await app.getTaskText(laterTasks[0]);
    expect(taskText).toContain('Moving task');
  });

  test('should move task from Later to Today', async () => {
    await app.addLaterTask('Moving back');
    await app.clickMoveButton('Moving back');

    const todayTasks = await app.getTodayTasks();
    const laterTasks = await app.getLaterTasks();

    expect(todayTasks.length).toBe(1);
    expect(laterTasks.length).toBe(0);

    const taskText = await app.getTaskText(todayTasks[0]);
    expect(taskText).toContain('Moving back');
  });

  test('should edit task text', async ({ page }) => {
    await app.addTodayTask('Original text');
    await app.clickTaskText('Original text');

    await page.fill('.modal input', 'Edited text');
    await app.clickModalSave();

    const task = await app.getTaskByText('Edited text');
    expect(task).toBeTruthy();
  });

  test('should delete task', async () => {
    await app.addTodayTask('Task to delete');
    await app.longPressTask('Task to delete');
    await app.selectContextMenuItem('Delete');

    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(0);
  });

  test('should mark task as important', async () => {
    await app.addTodayTask('Important task');
    await app.longPressTask('Important task');
    await app.selectContextMenuItem('Toggle Important');

    const isImportant = await app.isTaskImportant('Important task');
    expect(isImportant).toBe(true);
  });

  test('should persist tasks after page reload', async () => {
    await app.addTodayTask('Persistent task');
    await app.reload();

    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(1);

    const taskText = await app.getTaskText(tasks[0]);
    expect(taskText).toContain('Persistent task');
  });

  test('should sort important tasks to top', async () => {
    await app.addTodayTask('Normal task 1');
    await app.addTodayTask('Normal task 2');
    await app.addTodayTask('Normal task 3');

    await app.longPressTask('Normal task 2');
    await app.selectContextMenuItem('Toggle Important');

    const tasks = await app.getTodayTasks();
    const firstTaskText = await app.getTaskText(tasks[0]);
    expect(firstTaskText).toContain('Normal task 2');
  });
});
