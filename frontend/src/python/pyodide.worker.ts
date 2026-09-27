// Classic web worker that runs learner code with Pyodide (CPython compiled to WebAssembly).
// Running in a worker keeps the UI responsive and lets the page kill runaway code.
import type { PyodideInterface } from 'pyodide';
import type { RunRequest, WorkerResponse } from './protocol';

declare function loadPyodide(options: { indexURL: string }): Promise<PyodideInterface>;

interface WorkerScope {
  importScripts(...urls: string[]): void;
  postMessage(message: WorkerResponse): void;
  onmessage: ((event: MessageEvent<RunRequest>) => void) | null;
}
const ctx = self as unknown as WorkerScope;

const PYODIDE_URL = '/pyodide/';
let pyodide: PyodideInterface | null = null;

const ready = (async () => {
  ctx.importScripts(`${PYODIDE_URL}pyodide.js`);
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  ctx.postMessage({ type: 'ready' });
})().catch((err: unknown) => {
  ctx.postMessage({ type: 'init-error', message: String(err) });
});

/** Drop Pyodide's internal frames so the traceback starts at the learner's code. */
function formatError(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  const lines = text.split('\n');
  const first = lines.findIndex((l) => l.includes('File "main.py"'));
  if (first === -1) return text;
  return ['Traceback (most recent call last):', ...lines.slice(first)].join('\n');
}

ctx.onmessage = async ({ data: { id, code } }) => {
  await ready;
  if (!pyodide) return;

  let stdout = '';
  let stderr = '';
  const out = new TextDecoder();
  const err = new TextDecoder();
  pyodide.setStdout({ write: (buf) => { stdout += out.decode(buf, { stream: true }); return buf.length; } });
  pyodide.setStderr({ write: (buf) => { stderr += err.decode(buf, { stream: true }); return buf.length; } });
  pyodide.setStdin({ stdin: () => undefined }); // input() raises EOFError: no keyboard input here

  // Fresh globals and an empty working directory for every run, so files and
  // variables from a previous attempt can't make a wrong answer pass.
  pyodide.runPython('import os, tempfile; os.chdir(tempfile.mkdtemp())');
  const globals = pyodide.toPy({ __name__: '__main__' });
  try {
    // Synchronous on purpose: in async mode a top-level StopIteration becomes RuntimeError (PEP 479).
    pyodide.runPython(code, { globals, filename: 'main.py' });
  } catch (e) {
    stderr += formatError(e);
  } finally {
    globals.destroy();
    // Flush output that didn't end in a newline, e.g. print('x', end='').
    pyodide.runPython('import sys; sys.stdout.flush(); sys.stderr.flush()');
    stdout += out.decode();
    stderr += err.decode();
  }

  ctx.postMessage({ type: 'result', id, stdout, stderr });
};
