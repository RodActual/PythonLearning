import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { diagnose } from './feedback.ts';
const c = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const l of c.lessons) for (const s of l.steps) {
  if (s.type !== 'code' || !s.track) continue;
  const code = s.initial_code;
  const dir = mkdtempSync(join(tmpdir(), 'fb'));
  writeFileSync(join(dir, 'main.py'), code);
  let stdout = '', stderr = '';
  try { stdout = execFileSync('python3', ['main.py'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 }); }
  catch (e: any) { stdout = e.stdout ?? ''; stderr = e.stderr ?? ''; }
  const ok = s.expected_error ? (stderr.trim().split('\n').pop() ?? '').startsWith(s.expected_error) : !stderr && stdout.trim() === s.expected_output.trim();
  if (ok) continue;
  console.log(`${l.id}:${s.id}  ${diagnose({ code, initialCode: '#', stdout, stderr, expectedOutput: s.expected_output, expectedError: s.expected_error }).slice(0, 230)}`);
}
