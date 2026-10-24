import { expect, test } from '@playwright/test';
import { lesson, nextButton, seedProgress, solutions } from './helpers';

const IDS = (process.env.WALK ?? '').split(',').filter(Boolean);

for (const id of IDS) {
  test(`walk ${id}`, async ({ page }) => {
    test.setTimeout(600_000);
    const l = lesson(id);
    await seedProgress(page, { version: 2, done: {}, first_try_ids: {} });
    await page.goto('/');
    await page.locator('.map-node .node-button', { hasText: l.title }).first().click();
    for (const [i, step] of l.steps.entries()) {
      await expect(page.locator('.step-kicker')).toContainText(`Step ${i + 1} of ${l.steps.length}`);
      if (step.type === 'quiz') {
        const idx = step.answer === undefined ? 0 : step.options!.indexOf(step.answer);
        await page.locator('.option-button').nth(idx).click();
        await expect(page.locator('.feedback'), `${id}:${step.id}`).toContainText(/Correct|Thanks/);
      } else if (step.type === 'code') {
        const ready = page.getByRole('button', { name: "Feeling good, let's try it" });
        if (await ready.count()) await ready.click();
        await page.locator('textarea.code-input').fill(solutions[`${id}:${step.id}`]);
        await page.locator('.run-button').click();
        await expect(page.locator('.run-status'), `${id}:${step.id}`).toContainText(/Correct output|we expected/, { timeout: 60_000 });
      }
      await nextButton(page).click();
    }
    await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
  });
}
