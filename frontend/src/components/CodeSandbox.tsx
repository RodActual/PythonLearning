import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import { pythonRunner } from '../python/runner';

interface CodeSandboxProps {
  initialCode: string;
  expectedOutput?: string;
  expectedError?: string;
  hint?: string;
  /** Text announcing the XP reward, or undefined when the step was already completed. */
  rewardText?: (firstTry: boolean) => string;
  onPass: (firstTry: boolean) => void;
}

type Status = 'idle' | 'success' | 'error';

/** Normalizes line endings and trailing whitespace so formatting noise doesn't fail a correct answer. */
const normalize = (s: string) =>
  s.replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n').trim();

/** The exception name from the last line of a traceback, e.g. "ZeroDivisionError". */
const raisedError = (stderr: string) => stderr.trim().split('\n').pop()?.split(':')[0].trim() ?? '';

const CodeSandbox = ({ initialCode, expectedOutput, expectedError, hint, rewardText, onPass }: CodeSandboxProps) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [pythonReady, setPythonReady] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  // Tab indents inside the editor. After Esc, Tab moves focus out instead (avoids a keyboard trap, WCAG 2.1.2).
  const [tabExits, setTabExits] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const runs = useRef(0);
  const passed = useRef(false);
  const editorId = useId();
  const helpId = useId();
  const hintId = useId();

  useEffect(() => {
    let active = true;
    pythonRunner
      .ready()
      .then(() => active && setPythonReady(true))
      .catch(() => active && setMessage('Could not load Python. Check your connection and press Run to retry.'));
    return () => {
      active = false;
    };
  }, []);

  // The editor renders its own textarea; link it to the keyboard help text.
  useEffect(() => {
    document.getElementById(editorId)?.setAttribute('aria-describedby', helpId);
  }, [editorId, helpId]);

  const onEditorKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault(); // keep focus here; the library would otherwise blur
      setTabExits(true);
    } else if (e.key !== 'Tab' && e.key !== 'Shift') {
      setTabExits(false);
    }
  };

  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStatus('idle');
    setMessage(pythonReady ? 'Running your code…' : 'Loading Python, this can take a few seconds the first time…');
    setOutput('');

    try {
      const { stdout, stderr } = await pythonRunner.run(code);
      runs.current += 1;
      setPythonReady(true);
      setOutput(stdout + stderr);

      const ok = expectedError
        ? raisedError(stderr) === expectedError
        : !stderr && normalize(stdout) === normalize(expectedOutput ?? '');

      if (ok) {
        // Revealing the hint gives up the first-try bonus.
        const firstTry = runs.current === 1 && !hintUsed;
        setStatus('success');
        const base = expectedError ? `That's the ${expectedError} we expected.` : 'Correct output!';
        const reward = !passed.current && rewardText ? ` ${rewardText(firstTry)}` : '';
        setMessage(base + reward);
        if (!passed.current) {
          passed.current = true;
          onPass(firstTry);
        }
      } else {
        setStatus('error');
        setMessage(
          expectedError
            ? `Not quite. This step expects the code to raise a ${expectedError}.`
            : `Not quite. Expected output: ${expectedOutput}`,
        );
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="sandbox-container">
      <div className="editor-wrapper">
        <label className="editor-label" htmlFor={editorId}>Code editor (main.py)</label>
        <Editor
          value={code}
          onValueChange={setCode}
          highlight={(c) => Prism.highlight(c, Prism.languages.python, 'python')}
          padding={16}
          className="code-editor"
          textareaId={editorId}
          textareaClassName="code-input"
          ignoreTabKey={tabExits}
          onKeyDown={onEditorKeyDown}
          onBlur={() => setTabExits(false)}
        />
        <p id={helpId} className="editor-help">
          {tabExits
            ? 'Tab now moves focus out of the editor.'
            : 'Tab inserts spaces. Press Esc, then Tab, to leave the editor.'}
        </p>
      </div>

      {hint && (
        <div className="hint-area">
          <button
            type="button"
            className="hint-button"
            aria-expanded={showHint}
            aria-controls={hintId}
            onClick={() => {
              setShowHint(!showHint);
              setHintUsed(true);
            }}
          >
            <span aria-hidden="true">💡 </span>
            {showHint ? 'Hide hint' : `Show hint${rewardText && !hintUsed ? ' (gives up the first-try bonus)' : ''}`}
          </button>
          <div id={hintId} hidden={!showHint}>
            <pre className="hint-text">{hint}</pre>
          </div>
        </div>
      )}

      <div className="sandbox-controls">
        <button type="button" onClick={runCode} aria-disabled={isRunning || undefined} className="run-button">
          <span aria-hidden="true">▶ </span>
          {isRunning ? (pythonReady ? 'Running…' : 'Loading Python…') : 'Run code'}
        </button>
        <p className={`run-status run-${status}`} role="status">
          {status === 'success' && <span aria-hidden="true">✓ </span>}
          {status === 'error' && <span aria-hidden="true">✗ </span>}
          {message}
        </p>
      </div>

      <div className="terminal-wrapper">
        <h4 className="terminal-label" id={`${editorId}-out`}>Console output</h4>
        <pre className={`terminal-output ${status === 'error' ? 'output-wrong' : ''}`} role="region" aria-labelledby={`${editorId}-out`} tabIndex={0}>
          {output || <span className="placeholder">Run your code to see the output here.</span>}
        </pre>
      </div>
    </div>
  );
};

export default CodeSandbox;
