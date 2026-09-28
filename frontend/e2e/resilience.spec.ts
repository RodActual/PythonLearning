import { expect, test } from '@playwright/test';
import { nextButton, seedProgress } from './helpers';

/** Opens the first coding challenge in lesson 1 (step 4). */
async function openCodeStep(page: import('@playwright/test').Page) {
  await seedProgress(page, { version: 2, done: { 'lesson-01': ['s01', 's02', 's03'] }, first_try_ids: {} });
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await expect(page.locator('.step-kicker')).toContainText('Coding challenge');
}

test('runaway output is stopped with a clear message', async ({ page }) => {
  await openCodeStep(page);
  await page.locator('textarea.code-input').fill("while True:\n    print('x' * 1000)");
  const started = Date.now();
  await page.locator('.run-button').click();
  await expect(page.locator('.terminal-output')).toContainText('Output limit reached', { timeout: 60_000 });
  // Stopped by the output cap, well before the 10-second timeout.
  expect(Date.now() - started).toBeLessThan(9_000 + 30_000 /* first Python load */);
});

test('infinite loops are stopped by the timeout and Python recovers', async ({ page }) => {
  test.setTimeout(120_000);
  await openCodeStep(page);
  await page.locator('textarea.code-input').fill('while True:\n    pass');
  await page.locator('.run-button').click();
  await expect(page.locator('.terminal-output')).toContainText('ran longer than 10 seconds', { timeout: 60_000 });
  await page.locator('textarea.code-input').fill("print('Learning Python')");
  await page.locator('.run-button').click();
  await expect(page.locator('.run-status')).toContainText('Correct output', { timeout: 60_000 });
});

test('a failed save is shown to the learner', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_FAIL_WRITES: boolean }).__MOCK_FAIL_WRITES = true;
  });
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await nextButton(page).click();
  await expect(page.locator('.save-status')).toContainText("Couldn't save");
});

test('saving while offline says it will sync later', async ({ page, context }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_PENDING: boolean }).__MOCK_PENDING = true;
  });
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await context.setOffline(true);
  await nextButton(page).click();
  await expect(page.locator('.save-status')).toContainText('Offline');
  await context.setOffline(false);
});

test('a successful save is confirmed', async ({ page }) => {
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await nextButton(page).click();
  await expect(page.locator('.save-status')).toContainText('Progress saved');
});
