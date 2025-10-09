/**
 * E2E Tests: Theme Switching
 * Tests dark/light theme toggle and persistence
 */

import { test, expect } from '@playwright/test';
import { AppPage } from './fixtures/app-page.js';

test.describe('Theme Switching', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearLocalStorage();
    await app.reload();
  });

  test('should toggle from dark to light theme', async () => {
    // Default is dark
    const initialTheme = await app.getCurrentTheme();
    expect(initialTheme).toBe('dark');

    // Toggle to light
    await app.toggleTheme();

    const newTheme = await app.getCurrentTheme();
    expect(newTheme).toBe('light');
  });

  test('should toggle from light back to dark', async () => {
    // Toggle to light
    await app.toggleTheme();
    expect(await app.getCurrentTheme()).toBe('light');

    // Toggle back to dark
    await app.toggleTheme();
    expect(await app.getCurrentTheme()).toBe('dark');
  });

  test('should persist theme after page reload', async () => {
    // Toggle to light
    await app.toggleTheme();
    expect(await app.getCurrentTheme()).toBe('light');

    // Reload page
    await app.reload();

    // Should still be light
    const theme = await app.getCurrentTheme();
    expect(theme).toBe('light');
  });

  test('should update theme label', async () => {
    // Default should say "Dark"
    let label = await app.getThemeLabel();
    expect(label).toContain('Dark');

    // Toggle to light
    await app.toggleTheme();

    // Should now say "Light"
    label = await app.getThemeLabel();
    expect(label).toContain('Light');
  });
});
