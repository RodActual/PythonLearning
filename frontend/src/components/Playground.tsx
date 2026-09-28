import { useEffect, useId, useState } from 'react';
import { pythonRunner } from '../python/runner';
import { useDocumentTitle, useFocusOnMount } from '../a11y/hooks';
import CodeEditor from './CodeEditor';
import { BLANK, EXAMPLES } from '../data/playground-examples';

/** Saves the learner's code in this browser only (per account). Storage can be unavailable, so every access is guarded. */
const storageKey = (uid: string) => `python-playground:${uid}`;
function load(uid: string): string {
  try {
    return localStorage.getItem(storageKey(uid)) ?? BLANK;
  } catch {
    return BLANK;
  }
}
function save(uid: string, code: string) {
  try {
    localStorage.setItem(storageKey(uid), code);
  } catch {
    // Private browsing or storage disabled: the code still works, it just isn't remembered.
  }
}

type Status = 'idle' | 'ok' | 'error';

const Playground = ({ uid, onBackToMap }: { uid: string; onBackToMap: () => void }) => {
  useDocumentTitle('Playground');
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [code, setCode] = useState(() => load(uid));
  const [example, setExample] = useState(EXAMPLES[1].name);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);
  const exampleId = useId();
  const outputId = useId();

  useEffect(() => {
    save(uid, code);
  }, [uid, code]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setStatus('idle');
    setOutput('');
    setMessage('Running…');
    try {
      const { stdout, stderr } = await pythonRunner.run(code);
      setOutput(stdout + stderr);
      setStatus(stderr ? 'error' : 'ok');
      setMessage(stderr ? 'Finished with an error. Read the last line of the output.' : 'Finished.');
    } catch (err) {
      setStatus('error');
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  const loadExample = () => {
    const chosen = EXAMPLES.find((e) => e.name === example);
    if (!chosen) return;
    if (code.trim() && code !== BLANK && !window.confirm('Replace your current code with this example?')) return;
    setCode(chosen.code);
    setOutput('');
    setStatus('idle');
    setMessage(`Loaded "${chosen.name}".`);
  };

  const clear = () => {
    if (!window.confirm('Clear the editor? This can’t be undone.')) return;
    setCode('');
    setOutput('');
    setStatus('idle');
    setMessage('Editor cleared.');
  };

  return (
    <div className="playground">
      <div className="top-controls">
        <button type="button" className="secondary-button" onClick={onBackToMap}>
          <span aria-hidden="true">← </span>Map
        </button>
      </div>
      <h2 ref={headingRef} tabIndex={-1}>Playground</h2>
      <p className="muted">
        Write and run any Python here. Nothing is graded and there's no XP, so experiment freely. Your code is saved in
        this browser. Programs stop after 10 seconds or 100,000 characters of output, and <code>input()</code> isn't
        available.
      </p>

      <div className="example-picker">
        <label htmlFor={exampleId}>Start from an example</label>
        <div className="example-row">
          <select id={exampleId} value={example} onChange={(e) => setExample(e.target.value)}>
            {EXAMPLES.map((e) => (
              <option key={e.name} value={e.name}>{e.name}</option>
            ))}
          </select>
          <button type="button" className="secondary-button" onClick={loadExample}>Load example</button>
        </div>
      </div>

      <div className="sandbox-container">
        <CodeEditor value={code} onChange={setCode} label="Playground editor (main.py)" />
        <div className="sandbox-controls">
          <button type="button" className="run-button" onClick={run} aria-disabled={running || undefined}>
            <span aria-hidden="true">▶ </span>{running ? 'Running…' : 'Run code'}
          </button>
          <button type="button" className="secondary-button" onClick={clear}>Clear editor</button>
          <p className={`run-status ${status === 'error' ? 'run-error' : status === 'ok' ? 'run-success' : ''}`} role="status">
            {message}
          </p>
        </div>
        <div className="terminal-wrapper">
          <h3 className="terminal-label" id={outputId}>Console output</h3>
          <pre className={`terminal-output ${status === 'error' ? 'output-wrong' : ''}`} role="region" aria-labelledby={outputId} tabIndex={0}>
            {output || <span className="placeholder">Run your code to see the output here.</span>}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default Playground;
