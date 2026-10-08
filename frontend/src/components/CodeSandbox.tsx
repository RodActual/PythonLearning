import { useEffect, useId, useRef, useState } from 'react';
import { diagnose, normalize, raisedError } from '../python/feedback';
import { pythonRunner } from '../python/runner';
import CodeEditor from './CodeEditor';
import RichText from './RichText';

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

const CodeSandbox = ({ initialCode, expectedOutput, expectedError, hint, rewardText, onPass }: CodeSandboxProps) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [pythonReady, setPythonReady] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [advice, setAdvice] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const runs = useRef(0);
  const passed = useRef(false);
  const outputId = useId();
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

  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStatus('idle');
    setMessage(pythonReady ? 'Running your code…' : 'Loading Python, this can take a few seconds the first time…');
    setOutput('');
    setAdvice('');

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
        setMessage('Not quite.');
        setAdvice(diagnose({ code, initialCode, stdout, stderr, expectedOutput, expectedError }));
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="sandbox-container">
      <CodeEditor value={code} onChange={setCode} />

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
          {advice && (
            <span className="run-advice">
              {' '}
              <RichText text={advice} />
            </span>
          )}
        </p>
      </div>

      {status === 'error' && (
        <div className="expected-output">
          {expectedError ? (
            <p>
              <strong>Expected:</strong> the code raises a <code>{expectedError}</code>.
            </p>
          ) : (
            <>
              <h4 className="expected-label">Expected output</h4>
              <pre>{expectedOutput}</pre>
            </>
          )}
        </div>
      )}

      <div className="terminal-wrapper">
        <h4 className="terminal-label" id={outputId}>Console output</h4>
        <pre className={`terminal-output ${status === 'error' ? 'output-wrong' : ''}`} role="region" aria-labelledby={outputId} tabIndex={0}>
          {output || <span className="placeholder">Run your code to see the output here.</span>}
        </pre>
      </div>
    </div>
  );
};

export default CodeSandbox;
