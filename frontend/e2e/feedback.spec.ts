import { expect, test } from '@playwright/test';
import { diagnose } from '../src/python/feedback';
import { expectAccessible, seedProgress } from './helpers';

// Lesson 1, step 4 asks the learner to print: Learning Python
const attempts: [code: string, advice: RegExp][] = [
  ['print(Learning Python)', /`?Learning Python`? has no quotation marks.*print\('Learning Python'\)/],
  ['print("Learning Python)', /never closes/],
  ["print('Learning Python'", /has no matching/],
  ["print('learning python')", /capital letters differ/],
  ["print('Learning')", /Part of the expected text is missing/],
  ['# Use print()\n', /haven't changed the starter code.*printed nothing/],
];

test('a wrong answer gets advice based on the code, the error and the output', async ({ page }) => {
  test.setTimeout(120_000);
  await seedProgress(page, { version: 2, done: { 'lesson-01': ['s01', 's02', 's03'] }, first_try_ids: {} });
  await page.goto('/');
  await page.locator('.continue-card .primary-button').click();
  await expect(page.locator('.step-kicker')).toContainText('Coding challenge');

  for (const [code, advice] of attempts) {
    await page.locator('textarea.code-input').fill(code);
    await page.locator('.run-button').click();
    await expect(page.locator('.run-status'), code).toContainText('Not quite.', { timeout: 60_000 });
    await expect(page.locator('.run-advice'), code).toHaveText(advice);
    await expect(page.locator('.run-advice'), code).not.toContainText('comma');
    await expect(page.locator('.expected-output pre')).toHaveText('Learning Python');
  }
  await expectAccessible(page);

  await page.locator('textarea.code-input').fill("print('Learning Python')");
  await page.locator('.run-button').click();
  await expect(page.locator('.run-status')).toContainText('Correct output');
  await expect(page.locator('.run-advice')).toHaveCount(0);
  await expect(page.locator('.expected-output')).toHaveCount(0);
});

const tb = (line: number, src: string, last: string) =>
  `Traceback (most recent call last):\n  File "main.py", line ${line}\n    ${src}\n${last}`;
const run = (code: string, stderr: string, expectedOutput?: string, stdout = '', expectedError?: string) =>
  diagnose({ code, initialCode: '# TODO', stdout, stderr, expectedOutput, expectedError });

test.describe('diagnose (no browser)', () => {
  test('errors are explained against the learner code', () => {
    expect(run('points = 50\nprint(Points)', tb(2, 'print(Points)', "NameError: name 'Points' is not defined. Did you mean: 'points'?"), '50')).toBe(
      'Line 2 (`print(Points)`): there is no variable named `Points`. Did you mean `points`? Spelling and capital letters must match exactly.',
    );
    expect(run('if 10 > 2\n    print(1)', tb(1, 'if 10 > 2', "SyntaxError: expected ':'"), '1')).toMatch(/^Line 1 .*must end with a colon/);
    expect(run("x = 'a' + 5", tb(1, "x = 'a' + 5", 'TypeError: can only concatenate str (not "int") to str'), 'a5')).toMatch(/str\(\)/);
    // Two variables side by side really do need a comma; that advice stays when the words aren't text to print.
    expect(run('a = 1\nb = 2\nprint(a b)', tb(3, 'print(a b)', 'SyntaxError: invalid syntax. Perhaps you forgot a comma?'), '1 2')).toMatch(/separate them with a comma/);
  });

  test('output differences are pointed out', () => {
    expect(run('print(4)', '', '4.0', '4\n')).toMatch(/formatted differently/);
    expect(run('print(1)\nprint(2)', '', '1', '1\n2\n')).toBe('Your code printed 2 lines, but only 1 is expected. Line 2 (`2`) is extra.');
    expect(run('print(1)', '', '1\n2', '1\n')).toBe('Your code printed 1 line, but 2 are expected. The next expected line is `2`.');
  });

  test('crash steps explain a missing or different error', () => {
    expect(run('print(1)', '', undefined, '1\n', 'ZeroDivisionError')).toBe(
      'Your code ran without an error, but this step expects it to raise a ZeroDivisionError.',
    );
    expect(run("int('x')", tb(1, "int('x')", "ValueError: invalid literal for int() with base 10: 'x'"), undefined, '', 'ZeroDivisionError')).toMatch(
      /^Your code raised ValueError instead of ZeroDivisionError\./,
    );
  });

  test('timeouts and the output limit pass through unchanged', () => {
    const stopped = 'Stopped: your code ran longer than 10 seconds. Check for an infinite loop.';
    expect(run('while True:\n    pass', stopped, '1')).toBe(stopped);
  });
});
