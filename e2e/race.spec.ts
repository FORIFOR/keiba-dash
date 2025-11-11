import { test, expect } from '@playwright/test';

test.describe('Horse Racing Game', () => {
  test('should display the initial UI correctly', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page.locator('h1')).toHaveText('Horse Racing Game');

    // Check seed input is present and has default value
    const seedInput = page.locator('input#seed');
    await expect(seedInput).toBeVisible();
    await expect(seedInput).toHaveValue('12345');

    // Check start button is present and enabled
    const startButton = page.getByTestId('start-race-btn');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
    await expect(startButton).toHaveText('Start Race');
  });

  test('should run race and display results', async ({ page }) => {
    await page.goto('/');

    // Set a specific seed for deterministic testing
    await page.locator('input#seed').fill('42');

    // Start the race
    await page.getByTestId('start-race-btn').click();

    // Button should show "Racing..." while race is running
    const startButton = page.getByTestId('start-race-btn');
    await expect(startButton).toHaveText('Racing...');
    await expect(startButton).toBeDisabled();

    // Wait for race to complete (max 6 seconds to be safe)
    await page.waitForSelector('[data-testid="payout-table"]', { timeout: 7000 });

    // Check payout table is displayed
    const payoutTable = page.getByTestId('payout-table');
    await expect(payoutTable).toBeVisible();

    // Check that results header is present
    await expect(payoutTable.locator('h2')).toHaveText('Race Results & Payouts');

    // Check table has header row
    await expect(payoutTable.locator('thead th').nth(0)).toHaveText('Position');
    await expect(payoutTable.locator('thead th').nth(1)).toHaveText('Horse');
    await expect(payoutTable.locator('thead th').nth(2)).toHaveText('Odds');
    await expect(payoutTable.locator('thead th').nth(3)).toHaveText('Payout (per $100)');

    // Check that all 8 horses are in the results
    const rows = payoutTable.locator('tbody tr');
    await expect(rows).toHaveCount(8);

    // Check first place has 5x odds and $500 payout
    const firstRow = rows.nth(0);
    await expect(firstRow.locator('td').nth(0)).toHaveText('1st');
    await expect(firstRow.locator('td').nth(2)).toHaveText('5x');
    await expect(firstRow.locator('td').nth(3)).toHaveText('$500.00');

    // Check second place has 3x odds and $300 payout
    const secondRow = rows.nth(1);
    await expect(secondRow.locator('td').nth(0)).toHaveText('2nd');
    await expect(secondRow.locator('td').nth(2)).toHaveText('3x');
    await expect(secondRow.locator('td').nth(3)).toHaveText('$300.00');

    // Check third place has 2x odds and $200 payout
    const thirdRow = rows.nth(2);
    await expect(thirdRow.locator('td').nth(0)).toHaveText('3rd');
    await expect(thirdRow.locator('td').nth(2)).toHaveText('2x');
    await expect(thirdRow.locator('td').nth(3)).toHaveText('$200.00');

    // Check reset button appears
    const resetButton = page.locator('button.btn-reset');
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveText('Reset');
  });

  test('should produce deterministic results with same seed', async ({ page }) => {
    await page.goto('/');

    // Run race with seed 12345
    await page.locator('input#seed').fill('12345');
    await page.getByTestId('start-race-btn').click();

    // Wait for results
    await page.waitForSelector('[data-testid="payout-table"]', { timeout: 7000 });

    // Get first place horse name
    const firstHorse1 = await page
      .locator('[data-testid="payout-table"] tbody tr')
      .nth(0)
      .locator('td')
      .nth(1)
      .textContent();

    // Reset and run again with same seed
    await page.locator('button.btn-reset').click();
    await page.getByTestId('start-race-btn').click();

    // Wait for results again
    await page.waitForSelector('[data-testid="payout-table"]', { timeout: 7000 });

    // Get first place horse name again
    const firstHorse2 = await page
      .locator('[data-testid="payout-table"] tbody tr')
      .nth(0)
      .locator('td')
      .nth(1)
      .textContent();

    // Should be the same horse
    expect(firstHorse1).toBe(firstHorse2);
  });

  test('should reset race correctly', async ({ page }) => {
    await page.goto('/');

    // Start race
    await page.getByTestId('start-race-btn').click();

    // Wait for completion
    await page.waitForSelector('[data-testid="payout-table"]', { timeout: 7000 });

    // Click reset
    await page.locator('button.btn-reset').click();

    // Payout table should be hidden
    await expect(page.getByTestId('payout-table')).not.toBeVisible();

    // Start button should be enabled again
    const startButton = page.getByTestId('start-race-btn');
    await expect(startButton).toBeEnabled();
    await expect(startButton).toHaveText('Start Race');
  });

  test('should show error for invalid seed', async ({ page }) => {
    await page.goto('/');

    // Enter invalid seed
    await page.locator('input#seed').fill('invalid');

    // Listen for alert dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toBe('Please enter a valid numeric seed');
      await dialog.accept();
    });

    // Try to start race
    await page.getByTestId('start-race-btn').click();
  });
});
