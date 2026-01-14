import { test, expect } from '@playwright/test';

test.describe('Quick Start Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('financial-visualizer');
    });
    await page.reload();
  });

  test('should display quick start page for new users', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    // Check main elements are present
    await expect(page.locator('h1')).toContainText('Where Your Money Leads');
    await expect(page.locator('.quick-start__form')).toBeVisible();
  });

  test('should show validation for empty required fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"], .quick-start__form .btn--primary');
    await submitButton.click();

    // Check that form is still visible (didn't navigate away)
    await expect(page.locator('.quick-start__form')).toBeVisible();
  });

  test('should complete quick start and show trajectory', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    // Fill in quick start form
    const nameInput = page.locator('input[placeholder*="name"], #profile-name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Profile');
    }

    // Fill income
    const incomeInput = page.locator('input[type="number"]').first();
    await incomeInput.fill('75000');

    // Fill age if present
    const ageInput = page.locator('input[placeholder*="age"], #current-age');
    if (await ageInput.isVisible()) {
      await ageInput.fill('30');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"], .quick-start__form .btn--primary');
    await submitButton.click();

    // Should navigate to trajectory view or editor
    await expect(page.locator('.trajectory-view, .profile-editor')).toBeVisible({ timeout: 10000 });
  });

  test('should allow navigation to full profile editor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    // Look for link to detailed editor
    const detailedLink = page.locator('text=detailed editor, text=full profile, text=More options');
    if (await detailedLink.first().isVisible()) {
      await detailedLink.first().click();
      await expect(page.locator('.profile-editor')).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Quick Start - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    // Form should be visible and usable
    await expect(page.locator('.quick-start__form')).toBeVisible();

    // Buttons should be full width on mobile
    const button = page.locator('.quick-start .btn').first();
    const buttonBox = await button.boundingBox();
    if (buttonBox) {
      expect(buttonBox.width).toBeGreaterThan(200);
    }
  });
});
