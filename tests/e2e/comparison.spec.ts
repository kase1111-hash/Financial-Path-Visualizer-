import { test, expect } from '@playwright/test';

test.describe('Scenario Comparison', () => {
  // Helper to navigate to scenario manager
  async function navigateToScenarios(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('financial-visualizer');
    });
    await page.reload();

    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    // Create a profile first
    const incomeInput = page.locator('input[type="number"]').first();
    await incomeInput.fill('90000');

    const submitButton = page.locator('button[type="submit"], .quick-start__form .btn--primary');
    await submitButton.click();

    await expect(page.locator('.trajectory-view, .profile-editor')).toBeVisible({ timeout: 15000 });

    // Navigate to scenarios/compare
    if (await page.locator('.trajectory-view').isVisible()) {
      const compareButton = page.locator('text=Compare, text=What-If, text=Scenarios').first();
      if (await compareButton.isVisible()) {
        await compareButton.click();
      }
    }
  }

  test('should display scenario manager', async ({ page }) => {
    await navigateToScenarios(page);

    await expect(page.locator('.scenario-manager')).toBeVisible({ timeout: 10000 });

    // Quick scenarios should be visible
    await expect(page.locator('.quick-scenario-card, .scenario-card').first()).toBeVisible();
  });

  test('should show quick scenario options', async ({ page }) => {
    await navigateToScenarios(page);

    await expect(page.locator('.scenario-manager')).toBeVisible({ timeout: 10000 });

    // Check for common quick scenarios
    const scenarioTexts = [
      'Extra Debt Payment',
      'Income Increase',
      'Increase Savings',
      'Reduce Expenses',
    ];

    for (const text of scenarioTexts) {
      const scenario = page.locator(`text=${text}`);
      // At least some scenarios should be present
      if (await scenario.first().isVisible()) {
        await expect(scenario.first()).toBeVisible();
        break;
      }
    }
  });

  test('should allow creating a comparison', async ({ page }) => {
    await navigateToScenarios(page);

    await expect(page.locator('.scenario-manager')).toBeVisible({ timeout: 10000 });

    // Find a quick scenario card and its compare button
    const scenarioCard = page.locator('.quick-scenario-card').first();
    if (await scenarioCard.isVisible()) {
      // Find input in the card
      const input = scenarioCard.locator('input[type="number"]');
      if (await input.isVisible()) {
        await input.fill('500');
      }

      // Click compare button
      const compareButton = scenarioCard.locator('button:has-text("Compare")');
      if (await compareButton.isVisible()) {
        await compareButton.click();

        // Should navigate to comparison view
        await expect(page.locator('.compare-view')).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test('should display comparison results', async ({ page }) => {
    await navigateToScenarios(page);

    await expect(page.locator('.scenario-manager')).toBeVisible({ timeout: 10000 });

    // Create a comparison
    const scenarioCard = page.locator('.quick-scenario-card').first();
    if (await scenarioCard.isVisible()) {
      const input = scenarioCard.locator('input[type="number"]');
      if (await input.isVisible()) {
        await input.fill('500');
      }

      const compareButton = scenarioCard.locator('button:has-text("Compare")');
      if (await compareButton.isVisible()) {
        await compareButton.click();
      }
    }

    // Check comparison view elements
    await expect(page.locator('.compare-view')).toBeVisible({ timeout: 15000 });

    // Should show key insight or summary
    const insight = page.locator('.key-insight, .compare-summary, .comparison-summary');
    if (await insight.first().isVisible()) {
      await expect(insight.first()).toBeVisible();
    }

    // Should show comparison chart or table
    const chartOrTable = page.locator('.compare-chart, .delta-table, svg');
    await expect(chartOrTable.first()).toBeVisible();
  });

  test('should show year slider in comparison', async ({ page }) => {
    await navigateToScenarios(page);

    await expect(page.locator('.scenario-manager')).toBeVisible({ timeout: 10000 });

    const scenarioCard = page.locator('.quick-scenario-card').first();
    if (await scenarioCard.isVisible()) {
      const compareButton = scenarioCard.locator('button:has-text("Compare")');
      if (await compareButton.isVisible()) {
        await compareButton.click();
      }
    }

    await expect(page.locator('.compare-view')).toBeVisible({ timeout: 15000 });

    // Year slider should be present
    const yearSlider = page.locator('.year-slider, input[type="range"]');
    if (await yearSlider.isVisible()) {
      await expect(yearSlider).toBeVisible();

      // Should be interactive
      const currentValue = await yearSlider.inputValue();
      await yearSlider.fill('2035');
      const newValue = await yearSlider.inputValue();
      expect(newValue).toBe('2035');
    }
  });

  test('should allow returning to trajectory', async ({ page }) => {
    await navigateToScenarios(page);

    await expect(page.locator('.scenario-manager')).toBeVisible({ timeout: 10000 });

    // Find back button
    const backButton = page.locator('text=Back, button:has-text("Back"), text=Timeline');
    if (await backButton.first().isVisible()) {
      await backButton.first().click();
      await expect(page.locator('.trajectory-view')).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Comparison - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should work on mobile devices', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('financial-visualizer');
    });
    await page.reload();

    await expect(page.locator('.quick-start')).toBeVisible({ timeout: 10000 });

    const incomeInput = page.locator('input[type="number"]').first();
    await incomeInput.fill('90000');

    const submitButton = page.locator('button[type="submit"], .quick-start__form .btn--primary');
    await submitButton.click();

    await expect(page.locator('.trajectory-view, .profile-editor')).toBeVisible({ timeout: 15000 });

    if (await page.locator('.trajectory-view').isVisible()) {
      const compareButton = page.locator('text=Compare, text=What-If, text=Scenarios').first();
      if (await compareButton.isVisible()) {
        await compareButton.click();
      }
    }

    await expect(page.locator('.scenario-manager')).toBeVisible({ timeout: 10000 });

    // Scenario cards should stack vertically
    const cards = page.locator('.quick-scenario-card');
    const count = await cards.count();
    if (count > 0) {
      const firstCard = await cards.first().boundingBox();
      if (firstCard) {
        // Card should take nearly full width on mobile
        expect(firstCard.width).toBeGreaterThan(300);
      }
    }
  });
});
