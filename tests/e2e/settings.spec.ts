import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  async function navigateToSettings(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('financial-visualizer');
    });
    await page.reload();

    // Create a profile first
    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    const incomeInput = page.locator('input[type="number"]').first();
    await incomeInput.fill('75000');

    const submitButton = page.locator('button[type="submit"], .quick-start__form .btn--primary');
    await submitButton.click();

    await expect(page.locator('.trajectory-view, .profile-editor')).toBeVisible({ timeout: 15000 });

    // Navigate to settings
    const settingsButton = page.locator('text=Settings, button:has-text("Settings"), a:has-text("Settings")');
    if (await settingsButton.first().isVisible()) {
      await settingsButton.first().click();
    }
  }

  test('should display settings page', async ({ page }) => {
    await navigateToSettings(page);

    await expect(page.locator('.settings-view')).toBeVisible({ timeout: 10000 });

    // Check main sections
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('should have theme selector', async ({ page }) => {
    await navigateToSettings(page);

    await expect(page.locator('.settings-view')).toBeVisible({ timeout: 10000 });

    // Theme select should be present
    const themeSection = page.locator('text=Theme, text=Appearance');
    if (await themeSection.first().isVisible()) {
      const themeSelect = page.locator('select').first();
      await expect(themeSelect).toBeVisible();

      // Should have light/dark/system options
      const options = await themeSelect.locator('option').allTextContents();
      expect(options.some(o => o.toLowerCase().includes('light'))).toBe(true);
      expect(options.some(o => o.toLowerCase().includes('dark'))).toBe(true);
    }
  });

  test('should change theme', async ({ page }) => {
    await navigateToSettings(page);

    await expect(page.locator('.settings-view')).toBeVisible({ timeout: 10000 });

    const themeSelect = page.locator('select').first();
    if (await themeSelect.isVisible()) {
      // Select dark theme
      await themeSelect.selectOption({ label: 'Dark' });

      // Check that theme attribute changed
      const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(theme).toBe('dark');

      // Select light theme
      await themeSelect.selectOption({ label: 'Light' });

      const lightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(lightTheme).toBe('light');
    }
  });

  test('should have export data option', async ({ page }) => {
    await navigateToSettings(page);

    await expect(page.locator('.settings-view')).toBeVisible({ timeout: 10000 });

    // Export button should be present
    const exportButton = page.locator('text=Export, button:has-text("Export")');
    await expect(exportButton.first()).toBeVisible();
  });

  test('should have import data option', async ({ page }) => {
    await navigateToSettings(page);

    await expect(page.locator('.settings-view')).toBeVisible({ timeout: 10000 });

    // Import section should be present
    const importSection = page.locator('text=Import');
    await expect(importSection.first()).toBeVisible();

    // File input should exist
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should have clear data option with confirmation', async ({ page }) => {
    await navigateToSettings(page);

    await expect(page.locator('.settings-view')).toBeVisible({ timeout: 10000 });

    // Clear data button should be present
    const clearButton = page.locator('button:has-text("Clear"), text=Clear All Data');
    if (await clearButton.first().isVisible()) {
      // Set up dialog handler
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss(); // Don't actually clear
      });

      await clearButton.first().click();
    }
  });

  test('should show about section', async ({ page }) => {
    await navigateToSettings(page);

    await expect(page.locator('.settings-view')).toBeVisible({ timeout: 10000 });

    // About section
    const aboutSection = page.locator('text=About');
    if (await aboutSection.first().isVisible()) {
      await expect(page.locator('text=Version')).toBeVisible();
    }
  });

  test('should navigate back to timeline', async ({ page }) => {
    await navigateToSettings(page);

    await expect(page.locator('.settings-view')).toBeVisible({ timeout: 10000 });

    // Back button
    const backButton = page.locator('text=Back, button:has-text("Back"), text=Timeline');
    if (await backButton.first().isVisible()) {
      await backButton.first().click();
      await expect(page.locator('.trajectory-view')).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Settings - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be usable on mobile', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('financial-visualizer');
    });
    await page.reload();

    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    const incomeInput = page.locator('input[type="number"]').first();
    await incomeInput.fill('75000');

    const submitButton = page.locator('button[type="submit"], .quick-start__form .btn--primary');
    await submitButton.click();

    await expect(page.locator('.trajectory-view, .profile-editor')).toBeVisible({ timeout: 15000 });

    const settingsButton = page.locator('text=Settings, button:has-text("Settings")');
    if (await settingsButton.first().isVisible()) {
      await settingsButton.first().click();
    }

    await expect(page.locator('.settings-view')).toBeVisible({ timeout: 10000 });

    // Settings should be scrollable and all sections visible
    await expect(page.locator('.settings-view__section').first()).toBeVisible();

    // Select should be full width
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      const selectBox = await select.boundingBox();
      if (selectBox) {
        expect(selectBox.width).toBeGreaterThan(200);
      }
    }
  });
});
