/**
 * E2E Tests: Pomodoro Timer
 * Tests Pomodoro timer functionality, rounds, and task integration
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Pomodoro Timer', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should start Pomodoro via long press', async () => {
    await app.addTodayTask('Focus task');

    await app.startPomodoro('Focus task');

    // Verify timer is active
    const isActive = await app.isPomodoroActive();
    expect(isActive).toBe(true);

    // Verify notification shown
    await app.waitForNotification('Pomodoro started');
  });

  test('should display timer in bottom corner', async () => {
    await app.addTodayTask('Timer visibility test');

    await app.startPomodoro('Timer visibility test');

    const timer = await app.getPomodoroTimer();
    expect(await timer.isVisible()).toBe(true);

    // Timer should be positioned in corner (has specific class/style)
    const position = await timer.boundingBox();
    expect(position).toBeTruthy();
  });

  test('should show 25:00 initially', async () => {
    await app.addTodayTask('Initial time test');

    await app.startPomodoro('Initial time test');

    const time = await app.getPomodoroTime();

    // Should show 25 minutes initially
    expect(time).toMatch(/25[:.]0?0/);
  });

  test('should count down time', async () => {
    await app.addTodayTask('Countdown test');

    await app.startPomodoro('Countdown test');

    const initialTime = await app.getPomodoroTime();

    // Wait 2 seconds
    await app.page.waitForTimeout(2000);

    const afterTime = await app.getPomodoroTime();

    // Time should have decreased
    expect(afterTime).not.toBe(initialTime);
  });

  test('should show round counter', async () => {
    await app.addTodayTask('Round counter test');

    await app.startPomodoro('Round counter test');

    const round = await app.getPomodoroRound();

    // Should start at round 1
    expect(round).toBe(1);
  });

  test('should show completion dialog after timer ends', async ({ page }) => {
    await app.addTodayTask('Completion test');

    await app.startPomodoro('Completion test');

    // Fast-forward timer by manipulating time (if possible)
    // Or set very short timer for testing
    await page.evaluate(() => {
      if (window.app && window.app.pomodoro) {
        window.app.pomodoro.state.timeRemaining = 1;
      }
    });

    // Wait for timer to complete
    await page.waitForTimeout(2000);

    // Completion dialog should appear
    const dialog = await page.locator('.pomodoro-prompt-modal');
    expect(await dialog.count()).toBeGreaterThan(0);
  });

  test('should have Task Done, Stop Timer, and Continue buttons', async ({ page }) => {
    await app.addTodayTask('Button test');

    await app.startPomodoro('Button test');

    // Fast-forward to completion
    await page.evaluate(() => {
      if (window.app && window.app.pomodoro) {
        window.app.pomodoro.state.timeRemaining = 1;
      }
    });

    await page.waitForTimeout(2000);

    // Check for all three buttons
    const taskDoneBtn = await page.locator('.pomodoro-prompt-modal button:has-text("Task Done")');
    const stopBtn = await page.locator('.pomodoro-prompt-modal button:has-text("Stop")');
    const continueBtn = await page.locator('.pomodoro-prompt-modal button:has-text("Continue")');

    expect(await taskDoneBtn.count()).toBeGreaterThan(0);
    expect(await stopBtn.count()).toBeGreaterThan(0);
    expect(await continueBtn.count()).toBeGreaterThan(0);
  });

  test('should mark task complete when clicking Task Done', async ({ page }) => {
    await app.addTodayTask('Task done test');

    await app.startPomodoro('Task done test');

    // Fast-forward to completion
    await page.evaluate(() => {
      if (window.app && window.app.pomodoro) {
        window.app.pomodoro.state.timeRemaining = 1;
      }
    });

    await page.waitForTimeout(2000);

    // Click Task Done
    await app.clickPomodoroAction('Task Done');

    // Verify task is completed
    const isCompleted = await app.isTaskCompleted('Task done test');
    expect(isCompleted).toBe(true);
  });

  test('should start new round when clicking Continue', async ({ page }) => {
    await app.addTodayTask('Continue test');

    await app.startPomodoro('Continue test');

    // Fast-forward to completion
    await page.evaluate(() => {
      if (window.app && window.app.pomodoro) {
        window.app.pomodoro.state.timeRemaining = 1;
      }
    });

    await page.waitForTimeout(2000);

    // Click Continue
    await app.clickPomodoroAction('Continue');

    // Wait a moment for new round to start
    await page.waitForTimeout(500);

    // Should be on round 2
    const round = await app.getPomodoroRound();
    expect(round).toBe(2);

    // Timer should be active again
    const isActive = await app.isPomodoroActive();
    expect(isActive).toBe(true);
  });

  test('should persist timer during navigation', async ({ page }) => {
    // Set viewport to mobile size to test mobile navigation
    await page.setViewportSize({ width: 375, height: 667 });

    await app.addTodayTask('Navigation test');
    await app.startPomodoro('Navigation test');

    // Verify timer is visible
    let isActive = await app.isPomodoroActive();
    expect(isActive).toBe(true);

    // Switch to Later tab (mobile navigation)
    await app.switchMobileTab('tomorrow');

    // Timer should still be visible
    isActive = await app.isPomodoroActive();
    expect(isActive).toBe(true);

    // Switch back to Today
    await app.switchMobileTab('today');

    // Timer should still be visible
    isActive = await app.isPomodoroActive();
    expect(isActive).toBe(true);
  });
});
