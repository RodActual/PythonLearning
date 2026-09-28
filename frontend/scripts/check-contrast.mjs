// Checks WCAG 2.1 contrast for the token pairs the UI uses, in both themes.
// Reads the /* tokens:dark */ and /* tokens:light */ blocks from src/index.css.
// Run: npm run check:contrast
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

const block = (name) => {
  const m = css.match(new RegExp(`/\\* tokens:${name} \\*/([\\s\\S]*?)/\\* end tokens:${name} \\*/`));
  if (!m) throw new Error(`tokens:${name} block not found in index.css`);
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, k, v]) => [k, v]));
};

const dark = block('dark');
// Light overrides dark; tokens the light block leaves out keep their dark values.
const themes = { dark, light: { ...dark, ...block('light') } };

// [foreground token, background token, minimum ratio, where]
const pairs = [
  ['ink', 'bg', 4.5, 'body text on page'],
  ['ink', 'surface', 4.5, 'body text on cards'],
  ['ink', 'surface-2', 4.5, 'text on raised surfaces'],
  ['ink', 'surface-3', 4.5, 'text on hovered surfaces'],
  ['muted', 'bg', 4.5, 'muted text on page'],
  ['muted', 'surface', 4.5, 'muted text on cards'],
  ['muted', 'surface-2', 4.5, 'muted text on raised surfaces'],
  ['on-primary', 'primary', 4.5, 'primary button'],
  ['on-primary', 'primary-hover', 4.5, 'primary button hover'],
  ['primary-ink', 'surface', 4.5, 'links and kickers'],
  ['primary-ink', 'primary-soft', 4.5, 'eyebrow on continue card'],
  ['primary-ink', 'bg', 4.5, 'links on page'],
  ['on-yellow', 'yellow', 4.5, 'level badge / active accent'],
  ['yellow-ink', 'surface', 4.5, 'XP text'],
  ['yellow-ink', 'yellow-soft', 4.5, 'XP chips / earned badge'],
  ['yellow-ink', 'surface-2', 4.5, 'XP text in HUD'],
  ['success-ink', 'surface', 4.5, 'success text'],
  ['success-ink', 'success-soft', 4.5, 'correct option'],
  ['on-success', 'success', 4.5, 'run button / completed node'],
  ['danger-ink', 'surface', 4.5, 'danger button text'],
  ['danger-ink', 'danger-soft', 4.5, 'incorrect option / auth error'],
  ['code-ink', 'code-bg', 4.5, 'code text'],
  ['term-muted', 'code-bar', 4.5, 'code window / terminal label'],
  ['term-ink', 'code-bg', 4.5, 'terminal output'],
  ['term-error', 'code-bg', 4.5, 'terminal error'],
  ['term-muted', 'code-bg', 4.5, 'terminal placeholder'],
  ['tok-comment', 'code-bg', 4.5, 'code comment'],
  ['tok-string', 'code-bg', 4.5, 'code string'],
  ['tok-keyword', 'code-bg', 4.5, 'code keyword'],
  ['tok-builtin', 'code-bg', 4.5, 'code builtin'],
  ['tok-function', 'code-bg', 4.5, 'code function'],
  ['tok-number', 'code-bg', 4.5, 'code number'],
  ['tok-operator', 'code-bg', 4.5, 'code operator'],
  ['tok-class', 'code-bg', 4.5, 'code class name'],
  ['border-strong', 'surface', 3, 'input / option borders'],
  ['focus', 'bg', 3, 'focus ring on page'],
  ['focus', 'surface', 3, 'focus ring on cards'],
  ['primary', 'surface', 3, 'next-lesson ring'],
  ['success', 'surface', 3, 'completed node ring'],
];

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

let failed = 0;

// The explicit [data-theme='light'] block must repeat the media-query light tokens exactly.
const explicit = css.match(/:root\[data-theme='light'\] \{([\s\S]*?)\n\}/);
const explicitTokens = Object.fromEntries([...(explicit?.[1] ?? '').matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]));
const mediaBlock = css.match(/\/\* tokens:light \*\/([\s\S]*?)\/\* end tokens:light \*\//)[1];
const mediaTokens = Object.fromEntries([...mediaBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]));
for (const key of new Set([...Object.keys(mediaTokens), ...Object.keys(explicitTokens)])) {
  if (mediaTokens[key] !== explicitTokens[key]) {
    failed++;
    console.log(`FAIL  light theme blocks disagree on --${key}: ${mediaTokens[key]} vs ${explicitTokens[key]}`);
  }
}
for (const [name, tokens] of Object.entries(themes)) {
  console.log(`\n${name} theme`);
  for (const [fg, bg, min, where] of pairs) {
    if (!tokens[fg] || !tokens[bg]) {
      failed++;
      console.log(`FAIL  missing token --${tokens[fg] ? bg : fg}  ${where}`);
      continue;
    }
    const r = ratio(tokens[fg], tokens[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1 (min ${min})  ${where}  [--${fg} on --${bg}]`);
  }
}
process.exit(failed ? 1 : 0);
