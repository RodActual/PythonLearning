import { expect, test } from '@playwright/test';
import { diagnose } from '../src/python/feedback';
import { expectAccessible, passCheckIn, seedProgress } from './helpers';

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
  await passCheckIn(page);

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

  test('advice added for the deep-dive and interview exercises', () => {
    // Text + number: offer the math fix too, not only str().
    expect(run("age = '30'\nprint(age + 1)", tb(2, 'print(age + 1)', 'TypeError: can only concatenate str (not "int") to str'), '31')).toMatch(/int\(\)/);
    // Repeating text by text.
    expect(run("print('=' * '3')", tb(1, "print('=' * '3')", "TypeError: can't multiply sequence by non-int of type 'str'"), '===')).toMatch(/whole number/);
    // A None from a function with no return.
    expect(run('x = f() + f()', tb(1, 'x = f() + f()', "TypeError: unsupported operand type(s) for +: 'NoneType' and 'NoneType'"), '2')).toMatch(/no `return`/);
    // print() exists but its line never ran.
    expect(run('for i in range(5, 0):\n    print(i)', '', '5', '')).toMatch(/never ran/);
    // Built-in suggestions only when the name is called.
    expect(run('print(flat)', tb(1, 'print(flat)', "NameError: name 'flat' is not defined. Did you mean: 'float'?"), '[1]')).not.toMatch(/float/);
    expect(run("print(lenn('ab'))", tb(1, "print(lenn('ab'))", "NameError: name 'lenn' is not defined. Did you mean: 'len'?"), '2')).toMatch(/Did you mean `len`/);
    // A print() that ran but printed an empty value, such as an empty file.
    expect(run("print(open('a.txt').read())", '', 'Ada', '\n')).toMatch(/only blank lines/);
    // A module name reused for a variable.
    const shadow = "import math\nmath = 'circle'\nprint(math.pi)";
    expect(run(shadow, tb(3, 'print(math.pi)', "AttributeError: 'str' object has no attribute 'pi'"), '3.14')).toMatch(/imported as a module.*different name/);
    expect(run("name = 'x'\nprint(name.size)", tb(2, 'print(name.size)', "AttributeError: 'str' object has no attribute 'size'"), '1')).not.toMatch(/__init__/);
    // A `...` placeholder called like a function.
    expect(run('f = ...\nf()', tb(2, 'f()', "TypeError: 'ellipsis' object is not callable"), '1')).toMatch(/placeholder/);
  });

  test('timeouts and the output limit pass through unchanged', () => {
    const stopped = 'Stopped: your code ran longer than 10 seconds. Check for an infinite loop.';
    expect(run('while True:\n    pass', stopped, '1')).toBe(stopped);
  });
});
