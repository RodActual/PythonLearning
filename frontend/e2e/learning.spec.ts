import { expect, test } from '@playwright/test';
import { allIds, lesson, nextButton, solutions, store } from './helpers';

test('complete lesson 1: quizzes, hints, predict-the-output, and real Python', async ({ page }) => {
  test.setTimeout(120_000);
  const l = lesson('lesson-01');
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();

  for (const [i, step] of l.steps.entries()) {
    await expect(page.locator('.step-kicker')).toContainText(`Step ${i + 1} of ${l.steps.length}`);
    if (step.type === 'quiz') {
      const wrong = step.options!.find((o) => o !== step.answer);
      if (i === 1 && wrong) {
        await page.locator('.option-button', { hasText: wrong }).click();
        await expect(page.locator('.feedback')).toContainText('Not quite');
      }
      await page.locator('.option-button').filter({ hasText: new RegExp(`^.?${escape(step.answer!)}`) }).first().click();
      await expect(page.locator('.feedback')).toContainText(/Correct|Thanks/);
    } else if (step.type === 'code') {
      if (step.id === 's10') {
        await page.locator('.hint-button').click();
        await expect(page.locator('.hint-button')).toHaveAttribute('aria-expanded', 'true');
      }
      await page.locator('textarea.code-input').fill(solutions[`lesson-01:${step.id}`]);
      await page.locator('.run-button').click();
      await expect(page.locator('.run-status')).toContainText('Correct output', { timeout: 60_000 });
    }
    await nextButton(page).click();
  }

  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeFocused();
  await expect(page.locator('.completion-card')).toContainText('You can now');

  const saved = (await store(page)) as { version: number; done: Record<string, string[]>; first_try_ids: Record<string, string[]> };
  expect(saved.version).toBe(2);
  expect(new Set(saved.done['lesson-01'])).toEqual(new Set(allIds('lesson-01')));
  // The wrong first answer and the hint both give up the first-try bonus.
  expect(saved.first_try_ids['lesson-01']).not.toContain('s02');
  expect(saved.first_try_ids['lesson-01']).not.toContain('s10');
  expect(saved.first_try_ids['lesson-01']).toContain('s04');
});

test('replaying a finished lesson earns no extra XP', async ({ page }) => {
  await page.addInitScript((ids) => {
    (window as unknown as { __MOCK_STORE: unknown }).__MOCK_STORE = { version: 2, done: { 'lesson-01': ids }, first_try_ids: {} };
  }, allIds('lesson-01'));
  await page.goto('/');
  const xpBefore = await page.locator('.hud-stats dd').first().innerText();
  await page.locator('.map-node').first().locator('.node-button').click();
  await expect(page.locator('.step-kicker')).toContainText('Step 1 of');
  await nextButton(page).click();
  await page.getByRole('button', { name: /Map/ }).click();
  await expect(page.locator('.hud-stats dd').first()).toHaveText(xpBefore);
});

test('password reset sends a link without revealing whether the account exists', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_LOGGED_OUT: boolean }).__MOCK_LOGGED_OUT = true;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Forgot your password?' }).click();
  await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
  await page.getByLabel('Email Address').fill('someone@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.locator('.auth-notice')).toContainText('If an account exists');
});

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
