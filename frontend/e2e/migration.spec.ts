import { expect, test } from '@playwright/test';
import { allIds, lesson, seedProgress, store } from './helpers';

test('old position-based progress is migrated to step ids', async ({ page }) => {
  const l1 = lesson('lesson-01');
  await seedProgress(page, {
    completed_steps: { 'lesson-01': l1.steps.length, 'lesson-02': 3 },
    first_try: { 'lesson-01': [1, 3] },
  });
  await page.goto('/');

  await expect.poll(async () => ((await store(page)) as { version?: number }).version).toBe(2);
  const saved = (await store(page)) as {
    done: Record<string, string[]>;
    first_try_ids: Record<string, string[]>;
    completed_steps: Record<string, number>;
  };
  expect(saved.done['lesson-01']).toEqual(allIds('lesson-01'));
  expect(saved.done['lesson-02']).toEqual(['s01', 's02', 's03']);
  expect(saved.first_try_ids['lesson-01']).toEqual(['s02', 's04']);
  // Old fields are kept so a rollback can't lose anyone's progress.
  expect(saved.completed_steps['lesson-01']).toBe(l1.steps.length);

  await expect(page.locator('.map-node').first()).toHaveClass(/state-completed/);
  await page.locator('.continue-card .primary-button').click();
  await expect(page.locator('.step-kicker')).toContainText('Step 4 of');
});

test('new-format progress is not rewritten', async ({ page }) => {
  await seedProgress(page, { version: 2, done: { 'lesson-01': ['s01'] }, first_try_ids: {} });
  await page.goto('/');
  await expect(page.locator('.skill-map').first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { __writes: number }).__writes)).toBe(0);
});
