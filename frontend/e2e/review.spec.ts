import { expect, test, type Page } from '@playwright/test';
import { allIds, expectAccessible, lesson, seedProgress, store } from './helpers';

type Card = { box: number; due: string };
type Saved = { review?: Record<string, Card> };

const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Answers the current card and moves on. Quizzes are answered right first time or after a
 * wrong guess; coding challenges are skipped (a miss). Returns whether it counts as right.
 */
async function answerCard(page: Page, wantRight: boolean): Promise<boolean> {
  if ((await page.locator('.step-kicker').textContent())?.includes('Coding challenge')) {
    await page.getByRole('button', { name: 'Skip (counts as a miss)' }).click();
    return false;
  }
  const shown = await page.locator('.option-text').allInnerTexts();
  const step = lesson('lesson-01').steps.find((s) => s.type === 'quiz' && JSON.stringify(s.options) === JSON.stringify(shown))!;
  if (!wantRight) {
    await page.locator('.option-text').getByText(step.options!.find((o) => o !== step.answer)!, { exact: true }).click();
  }
  await page.locator('.option-text').getByText(step.answer!, { exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('Correct');
  await page.locator('.lesson-nav-controls .primary-button').click();
  return wantRight;
}

test('completed steps become review cards, scheduled by the result', async ({ page }) => {
  test.setTimeout(90_000);
  await seedProgress(page, { version: 2, done: { 'lesson-01': allIds('lesson-01') }, first_try_ids: {} });
  await page.goto('/');

  // Lesson 1 has 7 answerable quizzes and 4 coding challenges.
  await expect(page.locator('.review-card')).toContainText('11 review cards are due');
  await expect(page.locator('.nav-badge')).toContainText('11');
  await page.locator('.review-card').getByRole('button', { name: 'Start review' }).click();
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeFocused();
  await expectAccessible(page);
  await page.locator('.review-start').getByRole('button', { name: 'Start review' }).click();

  let right = 0;
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.step-kicker')).toContainText(`Card ${i + 1} of 10`);
    if (i === 0) await expectAccessible(page);
    if (await answerCard(page, i % 2 === 0)) right++;
  }

  await expect(page.getByRole('heading', { name: 'Review complete' })).toBeFocused();
  await expect(page.locator('.completion-xp')).toHaveText(`${right} of 10 right on the first try`);
  await expectAccessible(page);

  const cards = Object.values(((await store(page)) as Saved).review ?? {});
  expect(cards).toHaveLength(10);
  expect(cards.filter((c) => c.box === 2 && c.due === localDate(3))).toHaveLength(right);
  expect(cards.filter((c) => c.box === 1 && c.due === localDate(1))).toHaveLength(10 - right);
  // One card was left for the next session.
  await page.getByRole('button', { name: 'Review menu' }).click();
  await expect(page.locator('.review-count')).toContainText('1 card is due');
});

test('nothing due shows the next date, and practice leaves the schedule alone', async ({ page }) => {
  const review = Object.fromEntries(
    lesson('lesson-01')
      .steps.filter((s) => (s.type === 'quiz' && s.answer) || s.type === 'code')
      .map((s) => [`lesson-01:${s.id}`, { box: 3, due: localDate(7) }]),
  );
  await seedProgress(page, { version: 2, done: { 'lesson-01': allIds('lesson-01') }, first_try_ids: {}, review });
  await page.goto('/');
  await expect(page.locator('.review-card')).toHaveCount(0);
  await page.locator('.main-nav').getByRole('button', { name: /Review/ }).click();
  await expect(page.locator('.review-count')).toContainText("You're all caught up. Next review in 7 days.");
  await page.getByRole('button', { name: 'Practice anyway' }).click();
  await expect(page.locator('.review-session .chip-next')).toHaveText('Practice');
  await expect(page.locator('.step-kicker')).toContainText('Card 1 of 5');
  await answerCard(page, true);
  expect(((await store(page)) as Saved).review).toEqual(review);
});

test('with no finished steps, review explains how to get cards', async ({ page }) => {
  await page.goto('/');
  await page.locator('.main-nav').getByRole('button', { name: /Review/ }).click();
  await expect(page.locator('.review-empty')).toContainText('Nothing to review yet');
  await expectAccessible(page);
});

test('a correct review moves a card up a box', async ({ page }) => {
  const quiz = lesson('lesson-01').steps.find((s) => s.type === 'quiz' && s.answer)!;
  await seedProgress(page, {
    version: 2,
    done: { 'lesson-01': [quiz.id] },
    first_try_ids: {},
    review: { [`lesson-01:${quiz.id}`]: { box: 3, due: localDate(-2) } },
  });
  await page.goto('/');
  await page.locator('.review-card').getByRole('button', { name: 'Start review' }).click();
  await page.locator('.review-start').getByRole('button', { name: 'Start review' }).click();
  await answerCard(page, true);
  const card = ((await store(page)) as Saved).review![`lesson-01:${quiz.id}`];
  expect(card).toEqual({ box: 4, due: localDate(14) });
});
