/**
 * E2E Tests: Input Validation and Error Handling
 * Tests edge cases and error conditions
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Input Validation and Error Handling', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should enforce max task length of 200 characters', async () => {
    const longText = 'a'.repeat(250); // 250 characters

    await app.typeInInput('today', longText);
    const inputValue = await app.getInputValue('today');

    // Input should be limited to 200 characters
    expect(inputValue.length).toBeLessThanOrEqual(200);
  });

  test('should not add empty task', async () => {
    await app.typeInInput('today', '');
    await app.pressKeyInInput('today', 'Enter');

    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(0);
  });

  test('should not add whitespace-only task', async () => {
    await app.typeInInput('today', '   ');
    await app.pressKeyInInput('today', 'Enter');

    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(0);
  });

  test('should handle malformed import data gracefully', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Try to import invalid data
    await app.importFromClipboard('{invalid json}');

    // Should handle gracefully - shows success with 0 tasks imported
    await app.waitForNotification('Imported');
    const notification = await app.getNotificationText();
    expect(notification).toContain('0');
  });

  test('should handle QR scan errors gracefully', async ({ page }) => {
    // Simulate invalid QR data
    await page.evaluate(() => {
      if (window.app && window.app.importExportManager) {
        try {
          window.app.importExportManager.importFromQRData('invalid-qr-data');
        } catch (e) {
          // Should handle error gracefully
        }
      }
    });

    // App should still be functional
    await app.addTodayTask('Test task after error');
    const tasks = await app.getTodayTasks();
    expect(tasks.length).toBe(1);
  });
});
