// Checks WCAG 2.1 contrast for the color pairs the UI uses. Run: npm run check:contrast
const pairs = [
  // [foreground, background, minimum ratio, where]
  ['#1b1f3b', '#ffffff', 4.5, 'body text'],
  ['#4a5068', '#ffffff', 4.5, 'muted text on surface'],
  ['#4a5068', '#f5f6fb', 4.5, 'muted text on surface-2'],
  ['#4a5068', '#eef1fb', 4.5, 'muted text on page background'],
  ['#ffffff', '#4338ca', 4.5, 'primary button'],
  ['#ffffff', '#3730a3', 4.5, 'primary hover / chip'],
  ['#3730a3', '#e0e7ff', 4.5, 'eyebrow on continue card'],
  ['#3730a3', '#ffffff', 4.5, 'step kicker'],
  ['#1b1f3b', '#c7cbe0', 4.5, 'disabled-looking primary'],
  ['#b91c1c', '#ffffff', 4.5, 'danger button'],
  ['#b91c1c', '#fee2e2', 3, 'danger button hover'],
  ['#7f1d1d', '#fee2e2', 4.5, 'incorrect option / auth error'],
  ['#14532d', '#dcfce7', 4.5, 'correct option'],
  ['#14532d', '#ffffff', 4.5, 'success text'],
  ['#ffffff', '#15803d', 4.5, 'run button / completed node'],
  ['#ffffff', '#14532d', 4.5, 'run button hover'],
  ['#ffffff', '#4b6b58', 4.5, 'run button busy'],
  ['#7c4a03', '#fef3c7', 4.5, 'XP chips / earned badge'],
  ['#1b1f3b', '#f59e0b', 4.5, 'level number'],
  ['#ffffff', '#312e81', 4.5, 'HUD text (gradient start)'],
  ['#ffffff', '#6d28d9', 4.5, 'HUD text (gradient end)'],
  ['#312e81', '#ffffff', 4.5, 'trophies button'],
  ['#86efac', '#0f172a', 4.5, 'terminal output'],
  ['#fca5a5', '#0f172a', 4.5, 'terminal error'],
  ['#a5b0c5', '#0f172a', 4.5, 'terminal placeholder'],
  ['#e2e8f0', '#1e293b', 4.5, 'terminal label'],
  ['#57606a', '#ffffff', 4.5, 'code comment'],
  ['#0a6b2f', '#ffffff', 4.5, 'code string'],
  ['#7c1fa3', '#ffffff', 4.5, 'code keyword'],
  ['#0550ae', '#ffffff', 4.5, 'code builtin'],
  ['#9a3412', '#ffffff', 4.5, 'code number'],
  ['#8a4b00', '#ffffff', 4.5, 'code class name'],
  ['#6b7280', '#ffffff', 3, 'input / option borders'],
  ['#9aa1b9', '#ffffff', 2.2, 'decorative path (not informational)'],
  ['#1d4ed8', '#ffffff', 3, 'focus ring'],
  ['#4338ca', '#ffffff', 3, 'next-lesson ring'],
];

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

let failed = 0;
for (const [fg, bg, min, where] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1 (min ${min})  ${where}`);
}
process.exit(failed ? 1 : 0);
