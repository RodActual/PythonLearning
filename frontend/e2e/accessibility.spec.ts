import { expect, test } from '@playwright/test';
import { expectAccessible, seedProgress, signedOut } from './helpers';

test('sign-in page with course overview', async ({ page }) => {
  await signedOut(page);
  await page.goto('/');
  await expect(page.locator('.auth-card')).toBeVisible();
  await expect(page.locator('.course-about')).toHaveAttribute('open', '');
  await expectAccessible(page);
});

test('first Tab reaches the skip link', async ({ page }) => {
  await signedOut(page);
  await page.goto('/');
  await expect(page.locator('.auth-card')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Skip to main content');
});

test('map, unit details, and trophies', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your Learning Path' })).toBeFocused();
  await page.locator('.unit-details summary').first().click();
  await expectAccessible(page);
  await page.locator('.hud-trophies').click();
  await expect(page.getByRole('heading', { name: 'Trophy Case' })).toBeFocused();
  await expectAccessible(page);
});

test('lesson steps: text, quiz, and code', async ({ page }) => {
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await expect(page.locator('.why-banner')).toBeVisible();
  await expectAccessible(page);
});

test('phone width has no horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seedProgress(page, { version: 2, done: { 'lesson-01': ['s01', 's02'] }, first_try_ids: {} });
  await page.goto('/');
  await expect(page.locator('.skill-map').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  await expectAccessible(page);
});
