import { expect, test } from '@playwright/test';
import { expectAccessible } from './helpers';

test('playground runs code, loads examples, and remembers code', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.locator('.main-nav').getByRole('button', { name: /Playground/ }).click();
  await expect(page.getByRole('heading', { name: 'Playground' })).toBeFocused();
  await expect(page.locator('.main-nav').getByRole('button', { name: /Playground/ })).toHaveAttribute('aria-current', 'page');
  await expectAccessible(page);

  await page.locator('textarea.code-input').fill('total = sum(range(1, 101))\nprint(total)');
  await page.getByRole('button', { name: 'Run code' }).click();
  await expect(page.locator('.terminal-output')).toHaveText('5050', { timeout: 60_000 });
  await expect(page.locator('.run-status')).toHaveText('Finished.');

  // Errors are shown, not graded.
  await page.locator('textarea.code-input').fill('print(1 / 0)');
  await page.getByRole('button', { name: 'Run code' }).click();
  await expect(page.locator('.terminal-output')).toContainText('ZeroDivisionError');
  await expect(page.locator('.run-status')).toContainText('Finished with an error');

  // Examples replace the code after confirming.
  page.once('dialog', (d) => d.accept());
  await page.getByLabel('Start from an example').selectOption('FizzBuzz (loops and if)');
  await page.getByRole('button', { name: 'Load example' }).click();
  await page.getByRole('button', { name: 'Run code' }).click();
  await expect(page.locator('.terminal-output')).toContainText('FizzBuzz');

  // Code survives a reload.
  await page.reload();
  await page.locator('.main-nav').getByRole('button', { name: /Playground/ }).click();
  await expect(page.locator('textarea.code-input')).toHaveValue(/FizzBuzz/);
});

test('every playground example runs without errors', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.locator('.main-nav').getByRole('button', { name: /Playground/ }).click();
  const names = await page.getByLabel('Start from an example').locator('option').allInnerTexts();
  expect(names.length).toBeGreaterThan(3);
  page.on('dialog', (d) => d.accept());
  for (const name of names) {
    await page.getByLabel('Start from an example').selectOption(name);
    await page.getByRole('button', { name: 'Load example' }).click();
    await page.getByRole('button', { name: 'Run code' }).click();
    await expect(page.locator('.run-status'), name).toHaveText('Finished.', { timeout: 60_000 });
  }
});
