import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

type Step = { id: string; type: string; options?: string[]; answer?: string };
type Lesson = { id: string; title: string; unit: string; steps: Step[] };

export const course = JSON.parse(readFileSync(new URL('../src/data/lessons.json', import.meta.url), 'utf8')) as {
  lessons: Lesson[];
};
export const solutions = JSON.parse(readFileSync(new URL('../tests/solutions.json', import.meta.url), 'utf8')) as Record<
  string,
  string
>;
export const lesson = (id: string) => course.lessons.find((l) => l.id === id)!;
export const allIds = (id: string) => lesson(id).steps.map((s) => s.id);

/** Seeds the mock Firestore progress document before the app loads. */
export async function seedProgress(page: Page, data: unknown) {
  await page.addInitScript((d) => {
    (window as unknown as { __MOCK_STORE: unknown }).__MOCK_STORE = d;
  }, data);
}

export async function signedOut(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __MOCK_LOGGED_OUT: boolean }).__MOCK_LOGGED_OUT = true;
  });
}

export const store = (page: Page) => page.evaluate(() => (window as unknown as { __store: unknown }).__store);

/** Fails the test on any WCAG 2.x A/AA violation. */
export async function expectAccessible(page: Page) {
  // Let CSS transitions settle so colors are measured in their final state.
  await page.waitForTimeout(400);
  // AxeBuilder is typed against its own copy of playwright-core; the runtime objects are the same.
  const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

export const nextButton = (page: Page) => page.locator('.lesson-nav-controls .primary-button');
