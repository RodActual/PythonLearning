import { expect, test } from '@playwright/test';
import { expectAccessible, lesson, seedProgress } from './helpers';

const tiers = lesson('lesson-01').steps.find((s) => s.id === 's04') as unknown as { support: { heading: string }[] };

/** Opens lesson 1 at its first exercise (step 4), with steps 1-3 done. */
async function openFirstExercise(page: import('@playwright/test').Page) {
  await seedProgress(page, { version: 2, done: { 'lesson-01': ['s01', 's02', 's03'] }, first_try_ids: {} });
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await expect(page.locator('.step-kicker')).toContainText('Step 4 of');
}

test('feeling good goes straight to the exercise', async ({ page }) => {
  await openFirstExercise(page);
  await expect(page.locator('.check-in')).toBeVisible();
  await expect(page.locator('textarea.code-input')).toHaveCount(0);
  await expectAccessible(page);
  await page.getByRole('button', { name: "Feeling good, let's try it" }).click();
  await expect(page.locator('textarea.code-input')).toBeVisible();
  await expect(page.locator('.support-tier')).toHaveCount(0);
});

test('unsure shows up to two extra tiers, then offers a restart', async ({ page }) => {
  await openFirstExercise(page);
  await page.getByRole('button', { name: 'Not sure yet' }).click();
  await expect(page.getByRole('heading', { name: tiers.support[0].heading })).toBeFocused();
  await expect(page.locator('.support-tier')).toHaveCount(1);

  await page.getByRole('button', { name: 'Still unsure' }).click();
  await expect(page.getByRole('heading', { name: tiers.support[1].heading })).toBeFocused();
  await expect(page.locator('.support-tier')).toHaveCount(2);
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Still unsure' }).click();
  await expect(page.getByRole('heading', { name: "Let's start this lesson over" })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Still unsure' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Restart the lesson' }).click();
  await expect(page.locator('.step-kicker')).toContainText('Step 1 of');
});

test('after extra help, the learner can go on to the exercise', async ({ page }) => {
  await openFirstExercise(page);
  await page.getByRole('button', { name: 'Not sure yet' }).click();
  await page.getByRole('button', { name: "That helped, let's try it" }).click();
  await expect(page.locator('textarea.code-input')).toBeVisible();
});

test('finished exercises skip the check-in when revisited', async ({ page }) => {
  await seedProgress(page, { version: 2, done: { 'lesson-01': ['s01', 's02', 's03', 's04'] }, first_try_ids: {} });
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await expect(page.locator('.step-kicker')).toContainText('Step 5 of');
  await page.getByRole('button', { name: /Previous/ }).click();
  await expect(page.locator('.step-kicker')).toContainText('Step 4 of');
  await expect(page.locator('.check-in')).toHaveCount(0);
  await expect(page.locator('textarea.code-input')).toBeVisible();
});

test('lesson text explains how the syntax works and what it is used for', async ({ page }) => {
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await expect(page.locator('.explain-item dt')).toHaveText(['⚙️ How it works', "🛠️ What it's used for"]);
  await expectAccessible(page);
});
