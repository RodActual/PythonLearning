import { expect, test } from '@playwright/test';
import { expectAccessible } from './helpers';

const background = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

for (const scheme of ['dark', 'light'] as const) {
  test(`follows the ${scheme} system setting and passes axe`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Your Learning Path' })).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(scheme);
    await expectAccessible(page);
    await page.locator('.continue-card .primary-button').click();
    await expect(page.locator('.why-banner')).toBeVisible();
    await expectAccessible(page);
  });
}

test('toggle cycles System, Light, Dark and survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const toggle = page.locator('.theme-toggle');
  await expect(toggle).toHaveAccessibleName('Theme: System. Switch to Light.');
  const darkBg = await background(page);

  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await background(page)).not.toBe(darkBg);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.theme-toggle')).toHaveAccessibleName('Theme: Light. Switch to Dark.');

  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
});
