import { expect, test } from '@playwright/test';
import { chooseOption, lesson, seedProgress } from './helpers';

const steps = lesson('lesson-01').steps;
const quiz = steps[1]; // s02, the first quiz

test('quiz options are shuffled each time, but stay put during an attempt', async ({ page }) => {
  await seedProgress(page, { version: 2, done: { 'lesson-01': [steps[0].id] }, first_try_ids: {} });
  const positions = new Set<number>();
  // With 3 options, 10 showings leave the answer in one spot by chance only ~1 in 20,000 runs.
  for (let i = 0; i < 10 && positions.size < 2; i++) {
    await page.goto('/');
    await page.locator('.continue-card .primary-button').click();
    const shown = await page.locator('.option-text').allInnerTexts();
    expect([...shown].sort()).toEqual([...quiz.options!].sort());
    positions.add(shown.indexOf(quiz.answer!));
  }
  expect(positions.size).toBeGreaterThan(1);

  const before = await page.locator('.option-text').allInnerTexts();
  await chooseOption(page, quiz.options!.find((o) => o !== quiz.answer)!);
  await expect(page.locator('.feedback')).toContainText('Not quite');
  expect(await page.locator('.option-text').allInnerTexts()).toEqual(before);
});
