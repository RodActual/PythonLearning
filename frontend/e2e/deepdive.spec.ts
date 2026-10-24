import { expect, test } from '@playwright/test';
import { coreIds, course, expectAccessible, lesson, nextButton, seedProgress, store } from './helpers';

const steps = lesson('lesson-01').steps;
const firstDeep = steps.findIndex((s) => s.track === 'deep-dive');
const firstInterview = steps.findIndex((s) => s.track === 'interview');
const optionalCount = steps.filter((s) => s.track).length;

test('finishing the core completes a lesson; the deep dive is optional', async ({ page }) => {
  await seedProgress(page, { version: 2, done: { 'lesson-01': coreIds('lesson-01') }, first_try_ids: {} });
  await page.goto('/');
  const node = page.locator('.map-node').first();
  await expect(node).toHaveClass(/state-completed/);
  await expect(node.locator('.node-status')).toContainText(`Deep dive 0/${optionalCount}`);

  // Opening a finished lesson resumes at the deep dive, not at step 1.
  await node.locator('.node-button').click();
  await expect(page.locator('.step-kicker')).toContainText(`Step ${firstDeep + 1} of ${steps.length} · Deep dive`);
  await expect(page.locator('.track-banner')).toContainText('already counts as complete');
  await expectAccessible(page);
});

test('optional questions can be skipped without being saved as done', async ({ page }) => {
  await seedProgress(page, { version: 2, done: { 'lesson-01': coreIds('lesson-01') }, first_try_ids: {} });
  await page.goto('/');
  await page.locator('.map-node').first().locator('.node-button').click();
  await nextButton(page).click(); // the deep dive's first explanation
  await expect(page.locator('.step-kicker')).toContainText('Deep dive · Predict the output');
  await expect(page.locator('.next-hint')).toContainText('optional');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.locator('.step-kicker')).toContainText(`Step ${firstDeep + 3} of`);
  const saved = (await store(page)) as { done: Record<string, string[]> };
  expect(saved.done['lesson-01']).not.toContain(steps[firstDeep + 1].id);
});

test('core questions cannot be skipped', async ({ page }) => {
  await seedProgress(page, { version: 2, done: { 'lesson-01': ['s01'] }, first_try_ids: {} });
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await expect(page.locator('.step-kicker')).toContainText('Step 2 of');
  await expect(page.getByRole('button', { name: /^Skip/ })).toHaveCount(0);
});

test('the lesson-complete toast fires once, at the end of the core', async ({ page }) => {
  const core = coreIds('lesson-01');
  await seedProgress(page, { version: 2, done: { 'lesson-01': core.slice(0, -1) }, first_try_ids: {} });
  // Toasts disappear after a few seconds, so count every one that is ever added.
  await page.addInitScript(() => {
    const w = window as unknown as { __lessonToasts: number };
    w.__lessonToasts = 0;
    new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.textContent?.includes('Lesson complete:')) w.__lessonToasts++;
        });
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const toastCount = () => page.evaluate(() => (window as unknown as { __lessonToasts: number }).__lessonToasts);
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await expect(page.locator('.step-kicker')).toContainText(`Step ${core.length} of`);
  // The last core step is a quiz: answer it, then continue into the deep dive.
  const last = steps[core.length - 1];
  await page.locator('.option-button').filter({ hasText: last.answer! }).first().click();
  await nextButton(page).click();
  await expect(page.getByText('Lesson complete: Introduction to Python')).toBeVisible();
  await expect(page.locator('.track-banner')).toBeVisible();
  expect(await toastCount()).toBe(1);
  await nextButton(page).click(); // an optional step after the core is done
  await expect(page.locator('.step-kicker')).toContainText('Deep dive · Predict the output');
  await page.locator('.option-button').filter({ hasText: steps[core.length + 1].answer! }).first().click();
  await nextButton(page).click();
  await expect(page.locator('.step-kicker')).toContainText(`Step ${core.length + 3} of`);
  expect(await toastCount()).toBe(1);
});

test('the interview section has its own introduction', async ({ page }) => {
  const done = steps.slice(0, firstInterview).map((s) => s.id);
  await seedProgress(page, { version: 2, done: { 'lesson-01': done }, first_try_ids: {} });
  await page.goto('/');
  await page.locator('.map-node').first().locator('.node-button').click();
  await expect(page.locator('.step-kicker')).toContainText('Interview practice');
  await expect(page.locator('.track-banner.track-interview')).toContainText('real Python interviews');
  await expectAccessible(page);
});

test('the goal card counts solved interview challenges and opens the next one', async ({ page }) => {
  const l = lesson('lesson-01');
  const interview = l.steps.filter((s) => s.track === 'interview' && s.type === 'code');
  const unitTotal = course.lessons
    .filter((x) => x.unit === l.unit)
    .reduce((n, x) => n + x.steps.filter((s) => s.track === 'interview' && s.type === 'code').length, 0);
  await seedProgress(page, { version: 2, done: { 'lesson-01': [interview[0].id] }, first_try_ids: {} });
  await page.goto('/');
  const card = page.locator('.goal-card');
  await expect(card).toContainText('Land a technical job');
  await expect(card.locator('.goal-row').first().locator('.goal-count')).toHaveText(`1/${unitTotal}`);
  await card.getByRole('button', { name: /Try it/ }).click();
  const index = l.steps.findIndex((s) => s.id === interview[1].id);
  await expect(page.locator('.step-kicker')).toContainText(`Step ${index + 1} of ${l.steps.length} · Interview`);
});
