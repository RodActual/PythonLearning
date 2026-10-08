/**
 * Turns a failed coding-challenge run into specific guidance: it reads the learner's code,
 * the error Python raised and the output it printed, and compares them with what the step expects.
 */

export interface Attempt {
  code: string;
  initialCode: string;
  stdout: string;
  stderr: string;
  expectedOutput?: string;
  expectedError?: string;
}

/** Normalizes line endings and trailing whitespace so formatting noise doesn't fail a correct answer. */
export const normalize = (s: string) =>
  s.replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n').trim();

interface PyError {
  type: string;
  message: string;
  /** 1-based line in the learner's code, when the traceback names one. */
  line?: number;
}

/** Reads the exception name, message and learner line number from a traceback. */
export function parseError(stderr: string): PyError | null {
  const lines = stderr.trim().split('\n');
  const last = lines[lines.length - 1] ?? '';
  const m = /^([A-Za-z_][\w.]*(?:Error|Exception|Exit|Interrupt|Iteration|Warning)|AssertionError)(?::\s?(.*))?$/.exec(last.trim());
  if (!m) return null;
  let line: number | undefined;
  for (const l of lines) {
    const at = /File "(?:[^"]*\/)?main\.py", line (\d+)/.exec(l);
    if (at) line = Number(at[1]);
  }
  return { type: m[1], message: m[2] ?? '', line };
}

/** The exception name from the last line of a traceback, e.g. "ZeroDivisionError". */
export const raisedError = (stderr: string) => parseError(stderr)?.type ?? '';

const BUILTINS = new Set(
  'print len range int str float bool list dict set tuple type input sum min max abs round sorted reversed enumerate zip map filter any all open isinstance super iter next object True False None self'.split(' '),
);

/** Names the learner's code gives a value to: assignments, loop targets, functions, classes, imports, parameters. */
function definedNames(code: string): Set<string> {
  const names = new Set<string>();
  const add = (list: string) => list.split(/[\s,()*=:]+/).forEach((n) => /^[A-Za-z_]\w*$/.test(n) && names.add(n));
  for (const m of code.matchAll(/^[ \t]*([A-Za-z_][\w, \t]*?)\s*(?:[-+*/%]|\/\/|\*\*)?=(?!=)/gm)) add(m[1]);
  for (const m of code.matchAll(/\bfor\s+([\w, \t()]+?)\s+in\b/g)) add(m[1]);
  for (const m of code.matchAll(/\b(?:def|class)\s+(\w+)\s*(?:\(([^)]*)\))?/g)) {
    names.add(m[1]);
    if (m[2]) add(m[2].replace(/=[^,]*/g, ''));
  }
  for (const m of code.matchAll(/\b(?:import|as)\s+([\w, \t]+)/g)) add(m[1]);
  for (const m of code.matchAll(/\bexcept\b[^:]*\bas\s+(\w+)/g)) names.add(m[1]);
  for (const m of code.matchAll(/\blambda\s+([^:]*):/g)) add(m[1]);
  return names;
}

/** Levenshtein distance, for "did you mean" suggestions. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}

function closestName(name: string, names: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestScore = Infinity;
  for (const n of names) {
    if (n === name) continue;
    const score = n.toLowerCase() === name.toLowerCase() ? 0 : distance(n, name);
    if (score < bestScore && score <= Math.max(1, Math.floor(name.length / 3))) {
      best = n;
      bestScore = score;
    }
  }
  return best;
}

/** The text inside print( ... ) on a line, if the line is a print call. */
const printArgument = (src: string) => /\bprint\s*\((.*)\)\s*(?:#.*)?$/.exec(src)?.[1]?.trim();

/**
 * Bare words inside print() that look like text meant to be printed: no quotes on the line,
 * the words aren't variables in the code, and (when known) they appear in the expected output.
 */
function unquotedText(src: string, code: string, expectedOutput?: string): string | undefined {
  const arg = printArgument(src);
  if (!arg || /['"]/.test(arg)) return undefined;
  const words = arg.match(/[A-Za-z_]\w*/g) ?? [];
  if (!words.length) return undefined;
  const defined = definedNames(code);
  const unknown = words.filter((w) => !defined.has(w) && !BUILTINS.has(w));
  if (!unknown.length) return undefined;
  if (expectedOutput !== undefined && !unknown.some((w) => appearsAsText(w, expectedOutput))) return undefined;
  return arg;
}

/** True when `text` shows up in `output` as plain words, not as part of a name like `__main__.Cat`. */
function appearsAsText(text: string, output: string): boolean {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\w.'"])${escaped}($|[^\\w'"])`, 'im').test(output);
}

const quote = (s: string) => `\`${s}\``;

/** Explains a Python error in terms of the learner's own code. */
export function explainError(err: PyError, attempt: Attempt): string {
  const text = explainBody(err, attempt);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function explainBody(err: PyError, attempt: Attempt): string {
  const { code, expectedOutput } = attempt;
  const src = err.line ? code.split('\n')[err.line - 1]?.trim() ?? '' : '';
  const snippet = src && !src.startsWith('#') ? ` (${quote(src)})` : '';
  const where = err.line ? `Line ${err.line}${snippet}: ` : '';
  const msg = err.message;
  const missingQuotes = src ? unquotedText(src, code, expectedOutput) : undefined;
  const quotesFix = (text: string) =>
    `${where}${quote(text)} has no quotation marks, so Python reads it as code (variable names) instead of text. Put the text inside quotes: ${quote(`print('${text}')`)}.`;

  switch (err.type) {
    case 'SyntaxError': {
      if (missingQuotes) return quotesFix(missingQuotes);
      if (/unterminated (triple-quoted )?string/.test(msg))
        return `${where}a string opens with a quote mark but never closes. Add the matching closing quote at the end of the text.`;
      if (/was never closed/.test(msg)) {
        const bracket = /'(.)' was never closed/.exec(msg)?.[1] ?? '(';
        const closing = { '(': ')', '[': ']', '{': '}' }[bracket] ?? ')';
        return `${where}an opening ${quote(bracket)} has no matching ${quote(closing)}. Add the closing ${quote(closing)}.`;
      }
      if (/unmatched '(.)'/.test(msg))
        return `${where}there is an extra closing ${quote(/unmatched '(.)'/.exec(msg)![1])} with no opening one. Remove it, or add the missing opening bracket.`;
      if (/expected ':'/.test(msg))
        return `${where}lines that start a block (if, elif, else, for, while, def, class, try, except) must end with a colon ${quote(':')}.`;
      if (/Missing parentheses in call to 'print'/.test(msg))
        return `${where}print is a function, so it needs parentheses: ${quote("print('your text')")}.`;
      if (/Maybe you meant '==' or ':=' instead of '='/.test(msg))
        return `${where}a single ${quote('=')} stores a value. To compare two values in a condition, use ${quote('==')}.`;
      if (/Perhaps you forgot a comma/.test(msg))
        return `${where}two values sit side by side with nothing joining them. If they are text, put them inside one pair of quotes; if they are separate values, separate them with a comma.`;
      if (/invalid character/.test(msg))
        return `${where}there is a character Python doesn't accept, often a curly quote (‘ ’ “ ”) pasted from elsewhere. Retype the quotes with your keyboard.`;
      return `${where}Python couldn't understand this line (${msg}). Check the quotes, brackets and colons on it.`;
    }
    case 'IndentationError':
    case 'TabError': {
      const after = /expected an indented block after '?([\w ]+?)'? (?:statement|definition) on line (\d+)/.exec(msg);
      if (after)
        return `${where}the code that belongs to the ${after[1]} on line ${after[2]} must be indented. Add 4 spaces at the start of the line.`;
      if (/unexpected indent/.test(msg)) return `${where}this line is indented but nothing above it starts a block. Remove the spaces at the start of the line.`;
      if (/unindent does not match/.test(msg))
        return `${where}this line's indentation doesn't line up with the lines around it. Use exactly 4 spaces per level.`;
      return `${where}the indentation is off (${msg}). Use 4 spaces for each level.`;
    }
    case 'NameError': {
      const name = /name '(\w+)' is not defined/.exec(msg)?.[1];
      if (!name) break;
      if (missingQuotes) return quotesFix(missingQuotes);
      const defined = definedNames(code);
      const pySuggestion = /Did you mean: '(\w+)'/.exec(msg)?.[1];
      const suggestion =
        pySuggestion && (defined.has(pySuggestion) || distance(pySuggestion.toLowerCase(), name.toLowerCase()) <= 1)
          ? pySuggestion
          : closestName(name, defined);
      if (suggestion) return `${where}there is no variable named ${quote(name)}. Did you mean ${quote(suggestion)}? Spelling and capital letters must match exactly.`;
      if (expectedOutput && appearsAsText(name, expectedOutput))
        return `${where}${quote(name)} has no quotation marks, so Python looks for a variable with that name. If it's text, put it inside quotes.`;
      return `${where}${quote(name)} doesn't exist yet: nothing before this line creates it. Check the spelling, or create it (assign a value or define it) first.`;
    }
    case 'TypeError': {
      if (/can only concatenate str \(not "(\w+)"\) to str/.test(msg) || /unsupported operand type\(s\) for \+: '(int|float)' and 'str'|'str' and '(int|float)'/.test(msg))
        return `${where}${quote('+')} can't join text and a number. Convert the number with ${quote('str()')}, or use an f-string like ${quote("f'Score: {score}'")}.`;
      const missing = /(\w+)\(\) missing (\d+) required positional arguments?: (.*)/.exec(msg);
      if (missing) return `${where}${quote(`${missing[1]}()`)} needs ${missing[2]} more argument${missing[2] === '1' ? '' : 's'} (${missing[3]}). Pass a value for each parameter.`;
      const extra = /(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/.exec(msg);
      if (extra) return `${where}${quote(`${extra[1]}()`)} takes ${extra[2]} argument(s) but got ${extra[3]}. (Methods count ${quote('self')} too.)`;
      const noArgs = /(\w+)\(\) takes no arguments/.exec(msg);
      if (noArgs)
        return `${where}${quote(`${noArgs[1]}()`)} doesn't accept arguments yet. Give the class an ${quote('__init__')} that takes them, or make it inherit one from a parent class.`;
      if (/'NoneType' object/.test(msg))
        return `${where}a value is None, so it can't be used here (${msg}). A function with no ${quote('return')} (or ${quote('yield')}) gives back None.`;
      if (/object is not callable/.test(msg)) return `${where}${msg}. Something that isn't a function is being called with ( ). Check for a variable that reuses a function's name.`;
      if (/object is not subscriptable/.test(msg)) return `${where}${msg}. Square brackets [ ] only work on lists, strings, tuples and dictionaries.`;
      return `${where}a value has the wrong type for this operation (${msg}).`;
    }
    case 'AttributeError': {
      if (/'NoneType' object/.test(msg))
        return `${where}a value is None, so it has no attributes (${msg}). A function with no ${quote('return')} gives back None.`;
      const m = /'(\w+)' object has no attribute '(\w+)'(?:\. Did you mean: '(\w+)'\?)?/.exec(msg);
      if (m) return `${where}a ${m[1]} has no ${quote(m[2])}.${m[3] ? ` Did you mean ${quote(m[3])}?` : ' Check the spelling, and that it was set on the object (for example in __init__).'}`;
      break;
    }
    case 'IndexError':
      return `${where}the index is past the end (${msg}). Indexes start at 0, so the last item of a list with 3 items is [2], or [-1].`;
    case 'KeyError':
      return `${where}the dictionary has no key ${msg}. Check the spelling and quotes, or use ${quote('.get()')} to avoid the crash.`;
    case 'ValueError':
      if (/invalid literal for int\(\)/.test(msg)) return `${where}${quote('int()')} can only convert text made of digits (${msg}).`;
      break;
    case 'ZeroDivisionError':
      return `${where}the code divides by zero, which Python can't do.`;
    case 'FileNotFoundError':
      return `${where}that file doesn't exist yet (${msg}). Write it first with mode 'w', or check the file name.`;
    case 'RecursionError':
      return `${where}the function keeps calling itself without stopping. Check that the base case is reached.`;
    case 'AssertionError':
      return `${where}an assert check failed${msg ? `: ${msg}` : ''}. The condition on that line was False.`;
    case 'StopIteration':
      return `${where}${quote('next()')} was called after the iterator ran out of items.`;
    case 'EOFError':
      return `${where}${quote('input()')} can't read typing here. Set the value directly instead.`;
  }
  return `${where}Python raised ${err.type}${msg ? `: ${msg}` : ''}.`;
}

const show = (s: string) => (s === '' ? 'an empty line' : quote(s));

/** Explains how printed output differs from the expected output. */
export function compareOutput(stdout: string, expectedOutput: string): string {
  const got = normalize(stdout);
  const want = normalize(expectedOutput);
  if (!got) return 'Your code ran without errors but printed nothing. Use print() to show the result.';
  if (got.toLowerCase() === want.toLowerCase()) return 'Almost: the words are right but the capital letters differ. Match the capitalization exactly.';
  if (got.replace(/\s+/g, '') === want.replace(/\s+/g, '')) return 'Almost: the characters are right but the spaces or line breaks differ.';

  const g = got.split('\n');
  const w = want.split('\n');
  const i = g.findIndex((line, k) => line !== w[k]);
  const first = i === -1 ? g.length : i;
  const lineLabel = w.length > 1 || g.length > 1 ? `Line ${first + 1} of the output` : 'The output';

  if (first >= w.length) return `Your code printed ${g.length} lines, but only ${w.length} ${w.length === 1 ? 'is' : 'are'} expected. Line ${first + 1} (${show(g[first])}) is extra.`;
  if (first >= g.length) return `Your code printed ${g.length} line${g.length === 1 ? '' : 's'}, but ${w.length} are expected. The next expected line is ${show(w[first])}.`;

  const a = g[first];
  const b = w[first];
  const detail = (() => {
    if (/^(['"]).*\1$/.test(a) && a.slice(1, -1) === b) return ' The quote marks are showing in the output: print the text itself, not a string inside a string.';
    if (/^<__main__\.\w+ object at 0x[0-9a-f]+>$/.test(a)) return ` That's Python's default text for an object. Add a ${quote('__str__')} method to control what print() shows.`;
    if (a === 'None') return ` None usually means a function has no ${quote('return')}, so it gives back None.`;
    const isNum = (x: string) => x.trim() !== '' && !Number.isNaN(Number(x));
    if (isNum(a) && isNum(b))
      return Number(a) === Number(b) ? ` The number is right but formatted differently (for example ${quote('4')} vs ${quote('4.0')}, or missing decimal places).` : '';
    if (a.length >= 3 && (b.startsWith(a) || b.endsWith(a))) return ' Part of the expected text is missing.';
    if (b.length >= 3 && (a.startsWith(b) || a.endsWith(b))) return ' There is extra text.';
    let c = 0;
    while (c < a.length && a[c] === b[c]) c++;
    return c >= 3 ? ` They match up to ${quote(b.slice(0, c))}, then differ.` : '';
  })();
  const count = g.length !== w.length ? ` (You printed ${g.length} line${g.length === 1 ? '' : 's'}; ${w.length} expected.)` : '';
  return `${lineLabel} is ${show(a)}, but it should be ${show(b)}.${detail}${count}`;
}

const article = (word: string) => (/^[AEIOU]/i.test(word) ? 'an' : 'a');

/** Specific guidance for a run that didn't pass. */
export function diagnose(attempt: Attempt): string {
  const { code, initialCode, stdout, stderr, expectedOutput, expectedError } = attempt;
  const err = parseError(stderr);
  const unchanged = normalize(code) === normalize(initialCode) ? "You haven't changed the starter code yet. " : '';

  if (expectedError) {
    if (!err) return stderr.trim() || `Your code ran without an error, but this step expects it to raise ${article(expectedError)} ${expectedError}.`;
    return `Your code raised ${err.type} instead of ${expectedError}. ${explainError(err, attempt)}`;
  }
  // Timeouts and the output limit already explain themselves.
  if (stderr.trim() && !err) return stderr.trim();
  if (err) return unchanged + explainError(err, attempt);
  return unchanged + compareOutput(stdout, expectedOutput ?? '');
}
