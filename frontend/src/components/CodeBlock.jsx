import React from 'react';

/**
 * CodeBlock Component
 * Renders code snippets inside a styled <pre> block.
 * This ensures formatting, indentation, and white space are preserved.
 *
 * @param {string} code - The raw Python code string to display.
 */
const CodeBlock = ({ code }) => {
  return (
    <pre 
      className="code-block" // Uses styling defined in index.css
      style={{
        // Inline styles for quick reference, inherited from index.css
        whiteSpace: 'pre-wrap', 
        overflowX: 'auto',
      }}
    >
      <code>{code}</code>
    </pre>
  );
};

export default CodeBlock;