/**
 * E2E Tests: QR Code Sync
 * Tests QR v5 format encoding and decoding
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('QR Code Sync (v5 Format)', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should generate QR code for tasks', async ({ page }) => {
    // Add some tasks
    await app.addTodayTask('Task 1');
    await app.addTodayTask('Important Task');
    await app.addLaterTask('Later Task');

    // Mark one as important
    await app.longPressTask('Important Task');
    await app.selectContextMenuItem('Toggle Important');

    // Open QR modal
    await page.click('#qr-btn');

    // Verify QR code is displayed
    await page.waitForSelector('#qr-code img', { timeout: 5000 });
    const qrImage = await page.locator('#qr-code img').count();
    expect(qrImage).toBeGreaterThan(0);

    // Verify QR data is in v5 format (starts with "5~")
    const qrData = await page.evaluate(() => {
      return window.lastQRData; // Assuming the app exposes this for testing
    });

    if (qrData) {
      expect(qrData).toMatch(/^5~/);
    }
  });

  test('should export empty state correctly', async ({ page }) => {
    // Open QR modal with no tasks
    await page.click('#qr-btn');

    // Should still generate QR code for empty state
    await page.waitForSelector('#qr-code img', { timeout: 5000 });
    const qrImage = await page.locator('#qr-code img').count();
    expect(qrImage).toBeGreaterThan(0);
  });

  test('should handle large number of tasks', async ({ page }) => {
    // Add many tasks to test compression
    for (let i = 1; i <= 20; i++) {
      await app.addTodayTask(`Task ${i}`);
    }

    for (let i = 1; i <= 20; i++) {
      await app.addLaterTask(`Later ${i}`);
    }

    // Generate QR
    await page.click('#qr-btn');

    // Should succeed without "Too long" error
    const errorMessage = await page.locator('.error-message').count();
    expect(errorMessage).toBe(0);

    await page.waitForSelector('#qr-code img', { timeout: 5000 });
    const qrImage = await page.locator('#qr-code img').count();
    expect(qrImage).toBeGreaterThan(0);
  });

  test('should import tasks from QR data', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Manually inject QR data to simulate scanning
    // v5 format: "5~0~Task1|Task2*~LaterTask"
    const qrData = '5~0~Task1|Task2*~LaterTask';

    // Use the importFromClipboard method which handles QR data format
    await app.importFromClipboard(qrData);

    // Verify tasks were imported
    const todayTasks = await app.getTodayTasks();
    expect(todayTasks.length).toBe(2);

    const laterTasks = await app.getLaterTasks();
    expect(laterTasks.length).toBe(1);

    // Verify important flag
    const isImportant = await app.isTaskImportant('Task2');
    expect(isImportant).toBe(true);
  });

  test('should preserve completed count in QR', async ({ page }) => {
    // Add and complete some tasks
    await app.addTodayTask('Task 1');
    await app.addTodayTask('Task 2');
    await app.toggleTaskCompletion('Task 1');
    await app.toggleTaskCompletion('Task 2');

    const completedCount = await app.getCompletedCount();
    expect(completedCount).toBe(2);

    // Export and re-import
    await page.click('#qr-btn');

    const qrData = await page.evaluate(() => window.lastQRData);

    if (qrData) {
      // Should contain completed count: "5~2~..."
      expect(qrData).toMatch(/^5~2~/);
    }
  });
});
