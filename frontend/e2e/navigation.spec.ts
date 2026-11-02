import { expect, test } from '@playwright/test';
import { allIds, course, expectAccessible, lesson, seedProgress } from './helpers';

const foundations = course.lessons.filter((l) => l.unit === 'foundations');
const foundationsDone = { version: 2, done: Object.fromEntries(foundations.map((l) => [l.id, allIds(l.id)])), first_try_ids: {} };

test('the map shows one unit at a time, starting with the unit of the next lesson', async ({ page }) => {
  await seedProgress(page, foundationsDone);
  await page.goto('/');
  const picker = page.getByRole('navigation', { name: 'Units' });
  await expect(picker.locator('[aria-current="page"]')).toContainText('Functions & Data');
  await expect(page.locator('.unit')).toHaveCount(1);
  await expect(page.locator('.map-node.is-next')).toHaveCount(1);
  await expectAccessible(page);

  // Picking a unit swaps the path, updates the URL, and moves focus to the unit's heading.
  await picker.getByRole('link', { name: /Foundations/ }).click();
  await expect(page).toHaveURL(/#\/unit\/foundations$/);
  await expect(page.getByRole('heading', { level: 3, name: 'Foundations' })).toBeFocused();
  await expect(page.locator('.map-node')).toHaveCount(foundations.length);

  // Next-unit link at the bottom of the path.
  await page.getByRole('navigation', { name: 'Previous and next unit' }).getByRole('link', { name: /Next: Unit 2/ }).click();
  await expect(page).toHaveURL(/#\/unit\/functions-data$/);

  // Browser Back returns to the previous unit.
  await page.goBack();
  await expect(page).toHaveURL(/#\/unit\/foundations$/);
  await expect(picker.locator('[aria-current="page"]')).toContainText('Foundations');
});

test('Back leaves a lesson for its unit, and refresh keeps the step', async ({ page }) => {
  await seedProgress(page, { version: 2, done: { 'lesson-01': allIds('lesson-01').slice(0, 2) }, first_try_ids: {} });
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await expect(page).toHaveURL(/#\/lesson\/lesson-01\/3$/);
  await expect(page.locator('.step-kicker')).toContainText('Step 3 of');

  await page.reload();
  await expect(page.locator('.step-kicker')).toContainText('Step 3 of');

  // Steps replace the history entry, so one Back leaves the lesson.
  await page.locator('.lesson-nav-controls').getByRole('button', { name: 'Previous' }).click();
  await expect(page.locator('.step-kicker')).toContainText('Step 2 of');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Your Learning Path' })).toBeVisible();
});

test('a lesson link without a step opens where the learner left off', async ({ page }) => {
  await seedProgress(page, { version: 2, done: { 'lesson-01': allIds('lesson-01').slice(0, 4) }, first_try_ids: {} });
  await page.goto('/#/lesson/lesson-01');
  await expect(page.locator('.step-kicker')).toContainText(`Step 5 of ${lesson('lesson-01').steps.length}`);
  await expect(page).toHaveURL(/#\/lesson\/lesson-01\/5$/);
});

test('an unknown link shows a not-found page with a way home', async ({ page }) => {
  await page.goto('/#/lesson/no-such-lesson');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeFocused();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Go to your learning path' }).click();
  await expect(page.getByRole('heading', { name: 'Your Learning Path' })).toBeFocused();
});

test('the Progress page holds the goal, what needs work, trophies, and reset', async ({ page }) => {
  await page.goto('/');
  // The header no longer carries the destructive reset button.
  await expect(page.locator('.app-header').getByRole('button', { name: 'Reset all progress' })).toHaveCount(0);
  await expect(page.locator('.skill-map-view .goal-card')).toHaveCount(0);

  await page.locator('.main-nav').getByRole('link', { name: /Progress/ }).click();
  await expect(page.getByRole('heading', { name: 'Your Progress' })).toBeFocused();
  await expect(page.locator('.goal-card')).toBeVisible();
  await expect(page.locator('.needs-work')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset all progress' })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('button', { name: 'View trophy case' }).click();
  await expect(page.getByRole('heading', { name: 'Trophy Case' })).toBeFocused();
  await expect(page.locator('.main-nav').getByRole('link', { name: /Progress/ })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: /Back to progress/ }).click();
  await expect(page).toHaveURL(/#\/progress$/);
});

test('malformed or out-of-range links show not-found instead of crashing or a false completion', async ({ page }) => {
  await page.goto('/#/lesson/%E0');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.goto(`/#/lesson/lesson-01/${lesson('lesson-01').steps.length + 2}`);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
