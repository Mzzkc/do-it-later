/**
 * E2E Tests: Import/Export Functionality
 * Tests file export/import and clipboard operations
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

test.describe('Import/Export', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should export to clipboard', async ({ context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await app.addTodayTask('Task 1');
    await app.addTodayTask('Task 2');
    await app.addLaterTask('Later 1');

    await app.exportToClipboard();

    // Wait for export
    await app.page.waitForTimeout(500);

    // Verify clipboard has content
    const clipboardContent = await app.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
    expect(clipboardContent.length).toBeGreaterThan(0);

    // Should contain task data
    expect(clipboardContent).toContain('Task 1');
    expect(clipboardContent).toContain('Task 2');
    expect(clipboardContent).toContain('Later 1');
  });

  test('should import from clipboard', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create test data with JSON format
    const testData = JSON.stringify({
      tasks: [
        { id: 'test1', text: 'Imported Task 1', list: 'today', completed: false, important: false, createdAt: Date.now() },
        { id: 'test2', text: 'Imported Task 2', list: 'tomorrow', completed: false, important: false, createdAt: Date.now() }
      ],
      totalCompleted: 0,
      version: 2,
      currentDate: new Date().toISOString().split('T')[0],
      lastUpdated: Date.now()
    }, null, 2);

    await app.importFromClipboard(testData);

    // Verify tasks were imported
    const todayTasks = await app.getTodayTasks();
    const laterTasks = await app.getLaterTasks();

    expect(todayTasks.length).toBeGreaterThan(0);
    expect(laterTasks.length).toBeGreaterThan(0);
  });

  test('should preserve important flag on export/import', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await app.addTodayTask('Important task');
    await app.longPressTask('Important task');
    await app.selectContextMenuItem('Toggle Important');

    // Export
    await app.exportToClipboard();
    const exported = await app.getClipboardContent();

    // Clear and import
    await app.clearLocalStorage();
    await app.reload();
    await app.importFromClipboard(exported);

    // Verify important flag persisted
    const isImportant = await app.isTaskImportant('Important task');
    expect(isImportant).toBe(true);
  });

  test('should preserve deadlines on export/import', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await app.addLaterTask('Deadline task');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await app.setDeadline('Deadline task', tomorrow.toISOString().split('T')[0]);

    // Export
    await app.exportToClipboard();
    const exported = await app.getClipboardContent();

    // Clear and import
    await app.clearLocalStorage();
    await app.reload();
    await app.importFromClipboard(exported);

    // Verify deadline persisted
    const hasDeadline = await app.hasDeadline('Deadline task');
    expect(hasDeadline).toBe(true);
  });

  test('should preserve subtasks on export/import', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await app.addTodayTask('Parent');
    await app.addSubtask('Parent', 'Child 1');
    await app.addSubtask('Parent', 'Child 2');

    // Export
    await app.exportToClipboard();
    const exported = await app.getClipboardContent();

    // Clear and import
    await app.clearLocalStorage();
    await app.reload();
    await app.importFromClipboard(exported);

    // Verify subtasks persisted
    const subtasks = await app.getSubtasks('Parent');
    expect(subtasks.length).toBe(2);
  });

  test('should preserve completed count on export/import', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await app.addTodayTask('Task 1');
    await app.addTodayTask('Task 2');
    await app.toggleTaskCompletion('Task 1');
    await app.toggleTaskCompletion('Task 2');

    const count = await app.getCompletedCount();
    expect(count).toBe(2);

    // Export
    await app.exportToClipboard();
    const exported = await app.getClipboardContent();

    // Clear and import
    await app.clearLocalStorage();
    await app.reload();
    await app.importFromClipboard(exported);

    // Verify completed count persisted
    const newCount = await app.getCompletedCount();
    expect(newCount).toBe(2);
  });

  test('should handle export with empty state', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Export with no tasks
    await app.exportToClipboard();

    const clipboardContent = await app.getClipboardContent();

    // Should have some content (metadata at minimum)
    expect(clipboardContent).toBeTruthy();
    expect(clipboardContent.length).toBeGreaterThan(0);
  });

  test('should handle export with large dataset', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Add many tasks
    for (let i = 1; i <= 50; i++) {
      await app.addTodayTask(`Task ${i}`);
    }

    await app.exportToClipboard();

    const clipboardContent = await app.getClipboardContent();

    // Should successfully export large dataset
    expect(clipboardContent).toBeTruthy();
    expect(clipboardContent).toContain('Task 1');
    expect(clipboardContent).toContain('Task 50');
  });

  test('should merge import with existing data', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Add some existing tasks
    await app.addTodayTask('Existing Task');

    // Import new data
    const testData = JSON.stringify({
      tasks: [
        { id: 'new1', text: 'New Task', list: 'today', completed: false, important: false, createdAt: Date.now() }
      ],
      totalCompleted: 0,
      version: 2,
      currentDate: new Date().toISOString().split('T')[0],
      lastUpdated: Date.now()
    }, null, 2);

    await app.importFromClipboard(testData);

    // Should have both tasks
    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(2);
  });

  test('should handle invalid import data gracefully', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Try to import invalid JSON - app handles this gracefully by importing as empty
    await app.importFromClipboard('invalid json data {{{');

    // Should show success notification with 0 tasks (graceful handling)
    await app.page.waitForSelector('.notification', { timeout: 5000 });
    const notificationText = await app.getNotificationText();
    expect(notificationText.toLowerCase()).toContain('imported');
    expect(notificationText.toLowerCase()).toContain('0');
  });

  test('should show success notification after import', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const testData = JSON.stringify({
      tasks: [
        { id: 'test1', text: 'Test Task', list: 'today', completed: false, important: false, createdAt: Date.now() }
      ],
      totalCompleted: 0,
      version: 2,
      currentDate: new Date().toISOString().split('T')[0],
      lastUpdated: Date.now()
    }, null, 2);

    await app.importFromClipboard(testData);

    // Should show success notification
    await app.waitForNotification('imported');
  });

  test('should round-trip data integrity', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create complex task structure
    await app.addTodayTask('Parent');
    await app.addSubtask('Parent', 'Child');
    await app.addTodayTask('Important');
    await app.longPressTask('Important');
    await app.selectContextMenuItem('Toggle Important');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await app.setDeadline('Important', tomorrow.toISOString().split('T')[0]);

    // Export
    await app.exportToClipboard();
    const exported = await app.getClipboardContent();

    // Clear
    await app.clearLocalStorage();
    await app.reload();

    // Import
    await app.importFromClipboard(exported);

    // Verify everything is intact
    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(2); // Parent and Important (Child is a subtask)

    const subtasks = await app.getSubtasks('Parent');
    expect(subtasks.length).toBe(1);

    const isImportant = await app.isTaskImportant('Important');
    expect(isImportant).toBe(true);

    const hasDeadline = await app.hasDeadline('Important');
    expect(hasDeadline).toBe(true);
  });
});
