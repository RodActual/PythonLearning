import React, { useState } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css'; // Basic syntax highlighting styles

const CodeSandbox = ({ initialCode, expectedOutput, onPass }) => {
  const [code, setCode] = useState(initialCode || '# Write your Python code here\n');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error

  const runCode = async () => {
    setIsRunning(true);
    setStatus('idle');
    setOutput('Running...');

    try {
      // 1. Send code to Piston API (Free public execution engine)
      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'python',
          version: '3.10.0',
          files: [{ content: code }],
        }),
      });

      const data = await response.json();
      
      // 2. Process Result
      // Piston returns 'run.stdout' (success) or 'run.stderr' (error)
      const rawOutput = data.run.stdout || data.run.stderr || '';
      const cleanOutput = rawOutput.trim(); // Remove trailing newlines
      
      setOutput(rawOutput);

      // 3. Validation Logic
      // Check if the output matches what the lesson expects
      if (expectedOutput && cleanOutput === expectedOutput.trim()) {
        setStatus('success');
        onPass(); // Tell parent component the step is complete
      } else if (expectedOutput) {
        setStatus('error'); // Code ran, but output was wrong
      }

    } catch (err) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="sandbox-container">
      {/* EDITOR AREA */}
      <div className="editor-wrapper">
        <div className="editor-label">main.py</div>
        <Editor
          value={code}
          onValueChange={code => setCode(code)}
          highlight={code => highlight(code, languages.python)}
          padding={15}
          className="code-editor"
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 14,
          }}
        />
      </div>

      {/* CONTROLS */}
      <div className="sandbox-controls">
        <button 
          onClick={runCode} 
          disabled={isRunning}
          className="run-button"
        >
          {isRunning ? 'Running...' : '▶ Run Code'}
        </button>
        {status === 'success' && <span className="success-msg">✅ Correct Output!</span>}
        {status === 'error' && <span className="error-msg">❌ Incorrect. Expected: "{expectedOutput}"</span>}
      </div>

      {/* TERMINAL OUTPUT */}
      <div className="terminal-wrapper">
        <div className="terminal-label">Console Output:</div>
        <pre className={`terminal-output ${status === 'error' ? 'output-wrong' : ''}`}>
          {output || <span className="placeholder">Result will appear here...</span>}
        </pre>
      </div>
    </div>
  );
};

export default CodeSandbox;