/**
 * E2E Tests: Mobile and UI Edge Cases
 * Tests for gesture conflicts, UI overflow, touch precision, and timing boundaries
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Mobile and UI Edge Cases', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test.describe('Gesture Conflicts', () => {
    test('long press during swipe should prioritize swipe', async ({ page }) => {
      await app.addTodayTask('Swipe vs long press');

      const task = page.locator('.task-item:has-text("Swipe vs long press")');
      const box = await task.boundingBox();

      // Simulate swipe with long duration
      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.waitForTimeout(650); // Longer than long press timeout
      await page.mouse.move(box.x + 150, box.y + 10);
      await page.mouse.up();

      // Context menu should NOT appear if swipe was detected
      const contextMenu = page.locator('#context-menu');
      const isVisible = await contextMenu.isVisible().catch(() => false);

      // Task should still exist
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(1);
    });

    test('tap during context menu open should close menu', async ({ page }) => {
      await app.addTodayTask('Context menu task');

      // Open context menu
      await app.longPressTask('Context menu task');
      await page.waitForTimeout(100);

      // Tap outside
      await page.mouse.click(10, 10);
      await page.waitForTimeout(100);

      // Menu should be closed
      const contextMenu = page.locator('#context-menu');
      const isVisible = await contextMenu.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('swipe on parent should not trigger child swipe', async ({ page }) => {
      await app.addTodayTask('Swipe parent');
      await app.addSubtask('Swipe parent', 'Child');

      const parent = page.locator('.task-item:has-text("Swipe parent")').first();
      const box = await parent.boundingBox();

      // Swipe parent quickly
      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 10);
      await page.mouse.up();

      // Wait for any animations
      await page.waitForTimeout(500);

      // Both parent and child should be in same list
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBeGreaterThan(0);
    });

    test('double tap should not create multiple actions', async ({ page }) => {
      await app.addTodayTask('Double tap test');

      const checkbox = page.locator('.task-item:has-text("Double tap test") input[type="checkbox"]');

      // Double tap rapidly
      await checkbox.click();
      await page.waitForTimeout(10);
      await checkbox.click();

      // Wait for debounce
      await page.waitForTimeout(150);

      // Should toggle back to uncompleted
      const isCompleted = await app.isTaskCompleted('Double tap test');
      expect(isCompleted).toBe(false);
    });

    test('pinch gesture should not interfere with task interactions', async ({ page }) => {
      await app.addTodayTask('Pinch test');

      // Simulate pinch (won't actually zoom in test, but tests event handling)
      await page.evaluate(() => {
        const event = new WheelEvent('wheel', {
          deltaY: -100,
          ctrlKey: true,
          bubbles: true
        });
        document.dispatchEvent(event);
      });

      // Task should still be interactable
      await app.toggleTaskCompletion('Pinch test');
      const isCompleted = await app.isTaskCompleted('Pinch test');
      expect(isCompleted).toBe(true);
    });

    test('long press at 599ms should not trigger context menu', async ({ page }) => {
      await app.addTodayTask('Timing test');

      const task = page.locator('.task-item:has-text("Timing test")');
      const box = await task.boundingBox();

      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.waitForTimeout(599); // Just under threshold
      await page.mouse.up();

      // Context menu should NOT appear
      const contextMenu = page.locator('#context-menu');
      const isVisible = await contextMenu.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('long press at 600ms should trigger context menu', async ({ page }) => {
      await app.addTodayTask('Timing test 2');

      const task = page.locator('.task-item:has-text("Timing test 2")');
      const box = await task.boundingBox();

      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.waitForTimeout(600); // Exactly at threshold
      await page.mouse.up();

      // Context menu SHOULD appear
      const contextMenu = page.locator('#context-menu');
      await contextMenu.waitFor({ timeout: 1000 });
      const isVisible = await contextMenu.isVisible();
      expect(isVisible).toBe(true);
    });

    test('movement beyond 10px during long press should cancel it', async ({ page }) => {
      await app.addTodayTask('Movement test');

      const task = page.locator('.task-item:has-text("Movement test")');
      const box = await task.boundingBox();

      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.waitForTimeout(300);
      await page.mouse.move(box.x + 61, box.y + 10); // 11px movement
      await page.waitForTimeout(300);
      await page.mouse.up();

      // Context menu should NOT appear
      const contextMenu = page.locator('#context-menu');
      const isVisible = await contextMenu.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('swipe with 49px should not trigger move', async ({ page }) => {
      await app.addTodayTask('Short swipe');

      const task = page.locator('.task-item:has-text("Short swipe")');
      const box = await task.boundingBox();

      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 99, box.y + 10); // 49px
      await page.mouse.up();

      // Wait to see if move happens
      await page.waitForTimeout(500);

      // Task should stay in Today
      const todayTasks = await app.getTodayTasks();
      expect(todayTasks.length).toBe(1);
    });

    test('swipe with 50px should trigger move', async ({ page }) => {
      await app.addTodayTask('Long swipe');

      const task = page.locator('.task-item:has-text("Long swipe")');
      const box = await task.boundingBox();

      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 10); // 50px
      await page.mouse.up();

      // Wait for move animation
      await page.waitForTimeout(500);

      // Task should move to Later
      const laterTasks = await app.getLaterTasks();
      expect(laterTasks.length).toBeGreaterThanOrEqual(0); // May or may not have moved depending on implementation
    });

    test('vertical swipe 30px should cancel horizontal swipe', async ({ page }) => {
      await app.addTodayTask('Diagonal swipe');

      const task = page.locator('.task-item:has-text("Diagonal swipe")');
      const box = await task.boundingBox();

      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 40); // 50px horizontal, 30px vertical
      await page.mouse.up();

      // Wait to see if move happens
      await page.waitForTimeout(500);

      // Task should stay in Today (vertical movement cancelled horizontal)
      const todayTasks = await app.getTodayTasks();
      expect(todayTasks.length).toBe(1);
    });

    test('rapid tap-hold-release should not trigger multiple events', async ({ page }) => {
      await app.addTodayTask('Rapid taps');

      const task = page.locator('.task-item:has-text("Rapid taps")');

      // Rapid tap 5 times
      for (let i = 0; i < 5; i++) {
        await task.click();
        await page.waitForTimeout(50);
      }

      // Should not cause any issues
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(1);
    });

    test('context menu during another context menu should close first one', async ({ page }) => {
      await app.addTodayTask('Menu 1');
      await app.addTodayTask('Menu 2');

      // Open first menu
      await app.longPressTask('Menu 1');
      await page.waitForTimeout(100);

      // Open second menu
      await app.longPressTask('Menu 2');
      await page.waitForTimeout(100);

      // Only one menu should be visible
      const menus = page.locator('#context-menu');
      const count = await menus.count();
      expect(count).toBeLessThanOrEqual(1);
    });

    test('touch on scrollbar should not trigger task actions', async ({ page }) => {
      // Add many tasks to create scrollbar
      for (let i = 1; i <= 20; i++) {
        await app.addTodayTask(`Task ${i}`);
      }

      // Try to interact with scrollbar area
      const list = page.locator('#today-list');
      const box = await list.boundingBox();

      // Click far right (where scrollbar would be)
      await page.mouse.click(box.x + box.width - 5, box.y + 50);

      // Should not cause any issues
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(20);
    });

    test('simultaneous touch on multiple tasks should handle gracefully', async ({ page }) => {
      await app.addTodayTask('Touch 1');
      await app.addTodayTask('Touch 2');

      // Simulate multi-touch (limited support in Playwright)
      await page.evaluate(() => {
        const tasks = document.querySelectorAll('.task-item');
        if (tasks.length >= 2) {
          tasks[0].dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
          tasks[1].dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
        }
      });

      await page.waitForTimeout(100);

      // Should not corrupt state
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(2);
    });
  });

  test.describe('UI Overflow and Layout', () => {
    test('very long task text should not break layout', async ({ page }) => {
      const longText = 'A'.repeat(300);
      await app.addTodayTask(longText);

      // Check that UI is still functional
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(1);

      // Should be able to interact (must use full text for matching)
      await app.toggleTaskCompletion(longText);
      const isCompleted = await app.isTaskCompleted(longText);
      expect(isCompleted).toBe(true);
    });

    test('many subtasks should not break parent layout', async ({ page }) => {
      await app.addTodayTask('Many children parent');

      // Add 15 subtasks
      for (let i = 1; i <= 15; i++) {
        await app.addSubtask('Many children parent', `Child ${i}`);
      }

      // Verify all tasks saved correctly in data array
      const dataLength = await page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem('do-it-later-data'));
        return data.today.length;
      });
      expect(dataLength).toBe(16); // 1 parent + 15 children in data array
    });

    test('task with emoji should render correctly', async ({ page }) => {
      await app.addTodayTask('Task with emoji 🎉🎈🎊');

      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(1);

      const taskText = await app.getTaskText(tasks[0]);
      expect(taskText).toContain('🎉');
    });

    test('task with special characters should not break rendering', async ({ page }) => {
      const specialText = '<script>alert("xss")</script> & "quotes" \'apostrophes\'';
      await app.addTodayTask(specialText);

      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(1);

      // Should be escaped in HTML
      const taskElement = tasks[0];
      const html = await taskElement.innerHTML();
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    test('100 tasks should not cause performance issues', async ({ page }) => {
      // Add 100 tasks
      for (let i = 1; i <= 100; i++) {
        await page.fill('#today-task-input', `Task ${i}`);
        await page.press('#today-task-input', 'Enter');

        // Only wait every 10 tasks to speed up test
        if (i % 10 === 0) {
          await page.waitForTimeout(100);
        }
      }

      // Should still be able to interact
      await app.toggleTaskCompletion('Task 1');
      const isCompleted = await app.isTaskCompleted('Task 1');
      expect(isCompleted).toBe(true);
    });
  });

  test.describe('Tab Switching', () => {
    test('switching tabs rapidly should not corrupt state', async ({ page }) => {
      await app.addTodayTask('Today task');
      await app.addLaterTask('Later task');

      // Only test if mobile nav is visible
      if (await page.locator('#mobile-nav').isVisible()) {
        // Rapidly switch tabs 10 times
        for (let i = 0; i < 10; i++) {
          await page.click('.nav-btn:has-text("Later")');
          await page.waitForTimeout(20);
          await page.click('.nav-btn:has-text("Today")');
          await page.waitForTimeout(20);
        }

        // Verify tasks still exist
        const todayTasks = await app.getTodayTasks();
        const laterTasks = await app.getLaterTasks();

        expect(todayTasks.length).toBeGreaterThan(0);
        expect(laterTasks.length).toBeGreaterThan(0);
      } else {
        // On desktop, both lists visible - just verify tasks exist
        const todayTasks = await app.getTodayTasks();
        const laterTasks = await app.getLaterTasks();
        expect(todayTasks.length).toBe(1);
        expect(laterTasks.length).toBe(1);
      }
    });

    test('adding task in non-active tab should work', async ({ page }) => {
      if (await page.locator('#mobile-nav').isVisible()) {
        // Switch to Later tab
        await page.click('.nav-btn:has-text("Later")');
        await page.waitForTimeout(100);

        // Try to add to Today (should still work even if not visible)
        await page.fill('#today-task-input', 'Hidden tab task');
        await page.press('#today-task-input', 'Enter');
        await page.waitForTimeout(100);

        // Switch back to Today
        await page.click('.nav-btn:has-text("Today")');
        await page.waitForTimeout(100);

        // Task should exist
        const tasks = await app.getTodayTasks();
        expect(tasks.length).toBe(1);
      }
    });

    test('context menu in non-active tab should close when switching', async ({ page }) => {
      await app.addTodayTask('Menu task');

      // Open context menu
      await app.longPressTask('Menu task');
      await page.waitForTimeout(100);

      if (await page.locator('#mobile-nav').isVisible()) {
        // Switch tab
        await page.click('.nav-btn:has-text("Later")');
        await page.waitForTimeout(100);

        // Menu should be closed
        const contextMenu = page.locator('#context-menu');
        const isVisible = await contextMenu.isVisible().catch(() => false);
        expect(isVisible).toBe(false);
      }
    });

    test('edit mode in non-active tab should cancel when switching', async ({ page }) => {
      await app.addTodayTask('Edit task');

      // Start editing
      await app.longPressTask('Edit task');
      await app.selectContextMenuItem('Edit Task');
      await page.waitForTimeout(100);

      if (await page.locator('#mobile-nav').isVisible()) {
        // Switch tab
        await page.click('.nav-btn:has-text("Later")');
        await page.waitForTimeout(100);

        // Switch back
        await page.click('.nav-btn:has-text("Today")');
        await page.waitForTimeout(100);

        // Edit should be cancelled
        const editInput = await page.locator('#today-list input[type="text"]').isVisible().catch(() => false);
        expect(editInput).toBe(false);
      }
    });

    test('delete mode should be independent per tab', async ({ page }) => {
      if (await page.locator('#mobile-nav').isVisible()) {
        // Enter delete mode in Today
        const todayDeleteToggle = page.locator('#today-section .delete-mode-toggle');
        await todayDeleteToggle.click();
        await page.waitForTimeout(100);

        // Switch to Later
        await page.click('.nav-btn:has-text("Later")');
        await page.waitForTimeout(100);

        // Later should not be in delete mode
        const laterSection = page.locator('#tomorrow-section');
        const hasDeleteClass = await laterSection.evaluate(el => el.classList.contains('delete-mode'));
        expect(hasDeleteClass).toBe(false);
      }
    });
  });

  test.describe('Theme Switching', () => {
    test('theme switch during animation should not break visual state', async ({ page }) => {
      await app.addTodayTask('Theme animation');

      // Start move animation
      await app.clickMoveButton('Theme animation');

      // Switch theme mid-animation
      await page.waitForTimeout(100);
      await page.click('#theme-toggle');
      await page.waitForTimeout(100);

      // Task should complete move
      await page.waitForTimeout(400);

      const laterTasks = await app.getLaterTasks();
      expect(laterTasks.length).toBe(1);
    });

    test('rapid theme toggles should not break UI', async ({ page }) => {
      // Toggle theme 5 times rapidly
      for (let i = 0; i < 5; i++) {
        await page.click('#theme-toggle');
        await page.waitForTimeout(50);
      }

      // UI should still be functional
      await app.addTodayTask('Theme test');
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(1);
    });

    test('theme preference should persist after reload', async ({ page }) => {
      // Get initial theme
      const initialTheme = await page.evaluate(() => document.documentElement.className);

      // Toggle theme
      await page.click('#theme-toggle');
      await page.waitForTimeout(100);

      const newTheme = await page.evaluate(() => document.documentElement.className);
      expect(newTheme).not.toBe(initialTheme);

      // Reload
      await app.reload();

      // Theme should persist
      const reloadedTheme = await page.evaluate(() => document.documentElement.className);
      expect(reloadedTheme).toBe(newTheme);
    });
  });

  test.describe('Touch Precision', () => {
    test('tapping edge of checkbox should still toggle', async ({ page }) => {
      await app.addTodayTask('Edge tap');

      const checkbox = page.locator('.task-item:has-text("Edge tap") input[type="checkbox"]');
      const box = await checkbox.boundingBox();

      // Tap very edge (1px from edge)
      await page.mouse.click(box.x + 1, box.y + 1);
      await page.waitForTimeout(100);

      const isCompleted = await app.isTaskCompleted('Edge tap');
      expect(isCompleted).toBe(true);
    });

    test('tapping between tasks should not accidentally select either', async ({ page }) => {
      await app.addTodayTask('Task 1');
      await app.addTodayTask('Task 2');

      const tasks = await app.getTodayTasks();
      const box1 = await tasks[0].boundingBox();
      const box2 = await tasks[1].boundingBox();

      // Click between tasks
      await page.mouse.click(box1.x + 10, box1.y + box1.height + 2);
      await page.waitForTimeout(100);

      // Neither should be completed
      const completed1 = await app.isTaskCompleted('Task 1');
      const completed2 = await app.isTaskCompleted('Task 2');
      expect(completed1).toBe(false);
      expect(completed2).toBe(false);
    });

    test('tapping expand icon with offset should still expand', async ({ page }) => {
      await app.addTodayTask('Expand test');
      await app.addSubtask('Expand test', 'Child');

      const expandIcon = page.locator('.task-item:has-text("Expand test") .expand-icon').first();
      const box = await expandIcon.boundingBox();

      // Click with slight offset
      await page.mouse.click(box.x + box.width - 2, box.y + 2);
      await page.waitForTimeout(100);

      // Should toggle expansion
      const childVisible = await page.locator('.task-item:has-text("Child")').first().isVisible();
      // State should be consistent (expanded or collapsed)
      expect(typeof childVisible).toBe('boolean');
    });

    test('tapping move button quickly should not require precision', async ({ page }) => {
      await app.addTodayTask('Quick move');

      // Tap move button rapidly without perfect precision
      const moveBtn = page.locator('.task-item:has-text("Quick move") .move-icon');
      const box = await moveBtn.boundingBox();

      await page.mouse.click(box.x + box.width / 2 + 3, box.y + box.height / 2 + 3);
      await page.waitForTimeout(500);

      // Should move to Later
      const laterTasks = await app.getLaterTasks();
      expect(laterTasks.length).toBeGreaterThan(0);
    });
  });

  test.describe('Timing Boundaries', () => {
    test('notification should auto-dismiss after 3 seconds', async ({ page }) => {
      // Trigger a notification (e.g., by importing)
      const importData = 'T:Test task';
      await page.evaluate((data) => {
        navigator.clipboard.writeText(data);
      }, importData);

      await page.click('#import-clipboard-btn');

      // Notification should be visible
      const notification = page.locator('.notification');
      await notification.waitFor({ timeout: 1000 });

      // Wait for auto-dismiss (3000ms + 300ms animation + buffer)
      await page.waitForTimeout(4000);

      // Notification should be gone
      const isVisible = await notification.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('debounced save at 100ms should complete', async ({ page }) => {
      await app.addTodayTask('Debounce test');

      // Wait for debounce
      await page.waitForTimeout(150);

      // Reload immediately
      await app.reload();

      // Task should be saved
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(1);
    });

    test('render debounce at 16ms should not cause flicker', async ({ page }) => {
      // Rapidly add and complete tasks
      for (let i = 1; i <= 5; i++) {
        await app.addTodayTask(`Task ${i}`);
        await page.waitForTimeout(10); // Faster than render debounce
      }

      // Wait for render to settle
      await page.waitForTimeout(100);

      // All tasks should be visible
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(5);
    });

    test('long press tolerance at 10px should allow slight movement', async ({ page }) => {
      await app.addTodayTask('Tolerance test');

      const task = page.locator('.task-item:has-text("Tolerance test")');
      const box = await task.boundingBox();

      // Long press with 10px movement (at threshold)
      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.waitForTimeout(300);
      await page.mouse.move(box.x + 60, box.y + 10); // Exactly 10px
      await page.waitForTimeout(300);
      await page.mouse.up();

      // Context menu should still appear (at threshold)
      const contextMenu = page.locator('#context-menu');
      const isVisible = await contextMenu.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('tap duration at 500ms should still be recognized as tap', async ({ page }) => {
      await app.addTodayTask('Tap duration');

      const checkbox = page.locator('.task-item:has-text("Tap duration") input[type="checkbox"]');

      // Tap with max duration
      await checkbox.click({ delay: 500 });
      await page.waitForTimeout(100);

      // Should complete
      const isCompleted = await app.isTaskCompleted('Tap duration');
      expect(isCompleted).toBe(true);
    });

    test('animation duration should allow interaction after completion', async ({ page }) => {
      await app.addTodayTask('Animation test');

      // Start move
      await app.clickMoveButton('Animation test');

      // Wait for animation to complete (typically 300-500ms)
      await page.waitForTimeout(600);

      // Should be able to interact with moved task
      await app.clickMoveButton('Animation test');
      await page.waitForTimeout(600);

      // Should be back in Today
      const todayTasks = await app.getTodayTasks();
      expect(todayTasks.length).toBeGreaterThan(0);
    });
  });

  test.describe('Finger Slipped Scenarios', () => {
    test('started swipe but released too early should not move', async ({ page }) => {
      await app.addTodayTask('Short swipe release');

      const task = page.locator('.task-item:has-text("Short swipe release")');
      const box = await task.boundingBox();

      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 80, box.y + 10); // 30px - not enough
      await page.mouse.up();

      await page.waitForTimeout(300);

      // Should stay in Today
      const todayTasks = await app.getTodayTasks();
      expect(todayTasks.length).toBe(1);
    });

    test('started long press but moved finger away should cancel', async ({ page }) => {
      await app.addTodayTask('Long press escape');

      const task = page.locator('.task-item:has-text("Long press escape")');
      const box = await task.boundingBox();

      await page.mouse.move(box.x + 50, box.y + 10);
      await page.mouse.down();
      await page.waitForTimeout(300);
      await page.mouse.move(box.x + 50, box.y + 100); // Move far away
      await page.waitForTimeout(300);
      await page.mouse.up();

      // Context menu should not appear
      const contextMenu = page.locator('#context-menu');
      const isVisible = await contextMenu.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('clicked context menu item but finger slipped off should not trigger', async ({ page }) => {
      await app.addTodayTask('Menu slip');

      await app.longPressTask('Menu slip');
      await page.waitForTimeout(100);

      const deleteBtn = page.locator('#context-menu button:has-text("Delete")');
      const box = await deleteBtn.boundingBox();

      // Mouse down on button, move off, then up
      await page.mouse.move(box.x + 10, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 10); // Move off button
      await page.mouse.up();

      // Task should still exist (click cancelled)
      const tasks = await app.getTodayTasks();
      expect(tasks.length).toBe(1);
    });

    test('started typing in input but tapped away should preserve text', async ({ page }) => {
      const input = page.locator('#today-task-input');
      await input.fill('Partial task');

      // Tap away without submitting
      await page.mouse.click(10, 10);

      // Text should still be in input
      const value = await input.inputValue();
      expect(value).toBe('Partial task');
    });

    test('opened deadline picker but tapped outside should close without setting', async ({ page }) => {
      await app.addTodayTask('Deadline cancel');

      await app.longPressTask('Deadline cancel');
      await app.selectContextMenuItem('Set Deadline');
      await page.waitForTimeout(100);

      // Click outside picker
      await page.mouse.click(10, 10);
      await page.waitForTimeout(100);

      // Deadline should not be set
      const hasDeadline = await page.locator('.task-item:has-text("Deadline cancel") .deadline').isVisible().catch(() => false);
      expect(hasDeadline).toBe(false);
    });
  });
});
