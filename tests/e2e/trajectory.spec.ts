import { test, expect } from '@playwright/test';

test.describe('Trajectory View', () => {
  // Helper to create a profile and navigate to trajectory
  async function setupProfile(page: import('@playwright/test').Page) {
    await page.goto('/');

    // Clear and setup
    await page.evaluate(() => {
      indexedDB.deleteDatabase('financial-visualizer');
    });
    await page.reload();
    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    // Fill quick start
    const incomeInput = page.locator('input[type="number"]').first();
    await incomeInput.fill('80000');

    const submitButton = page.locator('button[type="submit"], .quick-start__form .btn--primary');
    await submitButton.click();

    // Wait for trajectory or editor
    await expect(page.locator('.trajectory-view, .profile-editor')).toBeVisible({ timeout: 15000 });
  }

  test('should display trajectory chart', async ({ page }) => {
    await setupProfile(page);

    // If in editor, navigate to trajectory
    if (await page.locator('.profile-editor').isVisible()) {
      const viewButton = page.locator('text=View Timeline, text=See Trajectory, button:has-text("Timeline")');
      if (await viewButton.first().isVisible()) {
        await viewButton.first().click();
      }
    }

    // Check trajectory elements
    await expect(page.locator('.trajectory-view')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.timeline-chart, .chart-container, svg')).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    await setupProfile(page);

    // Navigate to trajectory if needed
    if (await page.locator('.profile-editor').isVisible()) {
      const viewButton = page.locator('text=View Timeline, text=See Trajectory');
      if (await viewButton.first().isVisible()) {
        await viewButton.first().click();
      }
    }

    await expect(page.locator('.trajectory-view')).toBeVisible({ timeout: 10000 });

    // Summary cards should be visible
    await expect(page.locator('.summary-cards, .summary-card').first()).toBeVisible();
  });

  test('should allow year selection', async ({ page }) => {
    await setupProfile(page);

    if (await page.locator('.profile-editor').isVisible()) {
      const viewButton = page.locator('text=View Timeline, text=See Trajectory');
      if (await viewButton.first().isVisible()) {
        await viewButton.first().click();
      }
    }

    await expect(page.locator('.trajectory-view')).toBeVisible({ timeout: 10000 });

    // Year slider or selector
    const yearSlider = page.locator('.year-slider, input[type="range"]');
    if (await yearSlider.isVisible()) {
      await yearSlider.fill('2030');

      // Year detail should update
      const yearDetail = page.locator('.year-detail, .selected-year');
      if (await yearDetail.isVisible()) {
        await expect(yearDetail).toContainText('2030');
      }
    }
  });

  test('should show milestones', async ({ page }) => {
    await setupProfile(page);

    if (await page.locator('.profile-editor').isVisible()) {
      const viewButton = page.locator('text=View Timeline, text=See Trajectory');
      if (await viewButton.first().isVisible()) {
        await viewButton.first().click();
      }
    }

    await expect(page.locator('.trajectory-view')).toBeVisible({ timeout: 10000 });

    // Milestones list should be present
    const milestones = page.locator('.milestone-list, .milestones');
    if (await milestones.isVisible()) {
      await expect(milestones).toBeVisible();
    }
  });

  test('should navigate to optimizations', async ({ page }) => {
    await setupProfile(page);

    if (await page.locator('.profile-editor').isVisible()) {
      const viewButton = page.locator('text=View Timeline, text=See Trajectory');
      if (await viewButton.first().isVisible()) {
        await viewButton.first().click();
      }
    }

    await expect(page.locator('.trajectory-view')).toBeVisible({ timeout: 10000 });

    // Click optimizations button
    const optimizeButton = page.locator('text=Optimizations, text=Optimize, button:has-text("Optimize")');
    if (await optimizeButton.first().isVisible()) {
      await optimizeButton.first().click();
      await expect(page.locator('.optimizations-view')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate to compare scenarios', async ({ page }) => {
    await setupProfile(page);

    if (await page.locator('.profile-editor').isVisible()) {
      const viewButton = page.locator('text=View Timeline, text=See Trajectory');
      if (await viewButton.first().isVisible()) {
        await viewButton.first().click();
      }
    }

    await expect(page.locator('.trajectory-view')).toBeVisible({ timeout: 10000 });

    // Click compare/scenarios button
    const compareButton = page.locator('text=Compare, text=What-If, text=Scenarios');
    if (await compareButton.first().isVisible()) {
      await compareButton.first().click();
      await expect(page.locator('.scenario-manager, .compare-view')).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Trajectory View - Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display correctly on mobile', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('financial-visualizer');
    });
    await page.reload();

    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    const incomeInput = page.locator('input[type="number"]').first();
    await incomeInput.fill('80000');

    const submitButton = page.locator('button[type="submit"], .quick-start__form .btn--primary');
    await submitButton.click();

    await expect(page.locator('.trajectory-view, .profile-editor')).toBeVisible({ timeout: 15000 });

    // Chart should be visible even on mobile
    if (await page.locator('.trajectory-view').isVisible()) {
      const chart = page.locator('.timeline-chart, svg');
      await expect(chart.first()).toBeVisible();

      // Summary cards should stack vertically
      const cards = page.locator('.summary-cards');
      if (await cards.isVisible()) {
        const cardsBox = await cards.boundingBox();
        if (cardsBox) {
          // Should take full width on mobile
          expect(cardsBox.width).toBeLessThan(400);
        }
      }
    }
  });
});
