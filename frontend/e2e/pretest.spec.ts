import { expect, test, type Page } from '@playwright/test';
import { coreIds, course, expectAccessible, lesson, seedProgress, solutions, store } from './helpers';

type Saved = { pretest?: Record<string, { date: string; missed: string[] }>; done?: Record<string, string[]> };

// Every Foundations lesson except Lesson 1 is finished, so its pretest covers Lesson 1 only.
const foundations = course.lessons.filter((l) => l.unit === 'foundations').map((l) => l.id);
const othersDone = Object.fromEntries(foundations.filter((id) => id !== 'lesson-01').map((id) => [id, coreIds(id)]));

/** Answers the current pretest question: right first time, or skipped with "I don't know this yet". */
async function answer(page: Page, right: boolean) {
  if (!right) {
    await page.getByRole('button', { name: "I don't know this yet" }).click();
    return;
  }
  const id = await page.locator('.step-card').getAttribute('data-step-id');
  const step = lesson('lesson-01').steps.find((s) => s.id === id)!;
  if (step.type === 'code') {
    await page.locator('textarea.code-input').fill(solutions[`lesson-01:${step.id}`]);
    await page.locator('.run-button').click();
    await expect(page.locator('.run-status')).toContainText('Correct output', { timeout: 60_000 });
  } else {
    await page.locator('.option-text').getByText(step.answer!, { exact: true }).click();
    await expect(page.locator('.feedback')).toContainText('Correct');
  }
  await page.locator('.lesson-nav-controls .primary-button').click();
}

async function openPretest(page: Page) {
  await page.goto('/');
  await expect(page.locator('.map-node').nth(1)).toHaveClass(/state-completed/);
  await page.getByRole('button', { name: /Take the pretest.*Foundations/ }).click();
  await expect(page.getByRole('heading', { name: 'Pretest: Foundations' })).toBeFocused();
  await expect(page.locator('.review-count')).toContainText('Covers 1 lesson: Introduction to Python');
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Start pretest' }).click();
}

test('passing every question tests out of a lesson without earning XP', async ({ page }) => {
  test.setTimeout(90_000);
  await seedProgress(page, { version: 2, done: othersDone, first_try_ids: {} });
  await openPretest(page);
  const xpBefore = await page.locator('.hud-stats dd').first().innerText();

  // Two quizzes and one coding challenge from Lesson 1.
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.step-kicker')).toContainText(`Question ${i + 1} of 3`);
    if (i === 0) await expectAccessible(page);
    await answer(page, true);
  }

  await expect(page.getByRole('heading', { name: 'Pretest results' })).toBeFocused();
  await expect(page.locator('.completion-xp')).toHaveText('3 of 3 right · tested out of 1 of 1 lesson');
  await expect(page.locator('.needs-work')).toContainText('Every lesson is complete or tested out.');
  await expectAccessible(page);

  const saved = (await store(page)) as Saved;
  expect(saved.pretest?.['lesson-01'].missed).toEqual([]);
  expect(saved.done?.['lesson-01']).toBeUndefined();

  await page.getByRole('button', { name: 'Back to the map' }).click();
  const node = page.locator('.map-node').first();
  await expect(node).toHaveClass(/state-completed/);
  await expect(node.locator('.node-status')).toContainText('Tested out');
  await expect(page.locator('.hud-stats dd').first()).toHaveText(xpBefore);
  await expect(page.getByRole('button', { name: /Take the pretest.*Foundations/ })).toHaveCount(0);
  // Trophies need the core worked through, so the Foundations unit trophy isn't earned yet.
  await expect(page.locator('#unit-foundations').locator('xpath=ancestor::section').locator('.chip-done')).toHaveCount(0);
  await expect(node.getByRole('button', { name: 'Reset progress for Introduction to Python' })).toBeVisible();
});

test('missed questions are listed in what still needs work, with a way to practice them', async ({ page }) => {
  await seedProgress(page, { version: 2, done: othersDone, first_try_ids: {} });
  await openPretest(page);
  for (let i = 0; i < 3; i++) await answer(page, false);

  await expect(page.locator('.completion-xp')).toHaveText('0 of 3 right · tested out of 0 of 1 lesson');
  await expect(page.locator('.review-results .result-missed')).toContainText('Introduction to Python');
  const work = page.locator('.needs-work');
  await expect(work).toContainText('1 lesson to go');
  await expect(work.locator('.work-missed')).toContainText('Missed 3 pretest questions');
  await expect(work.locator('.work-missed-list li')).toHaveCount(3);
  await expectAccessible(page);

  const missed = ((await store(page)) as Saved).pretest!['lesson-01'].missed;
  expect(missed).toHaveLength(3);

  // Practice opens the lesson at the first missed question.
  await work.getByRole('button', { name: /^Practice/ }).click();
  const index = lesson('lesson-01').steps.findIndex((s) => s.id === missed[0]);
  await expect(page.locator('.step-kicker')).toContainText(`Step ${index + 1} of`);

  // The map's summary opens once a pretest has been taken.
  await page.locator('.main-nav').getByRole('button', { name: /Learning path/ }).click();
  await expect(page.locator('.skill-map-view .needs-work')).toHaveAttribute('open', '');
  await expect(page.locator('.skill-map-view .work-missed')).toHaveCount(1);
});
