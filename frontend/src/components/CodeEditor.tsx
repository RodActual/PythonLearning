import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';

interface CodeEditorProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

/**
 * Python editor with syntax highlighting. Tab indents; after Esc, Tab moves focus out
 * instead, so keyboard users are never trapped (WCAG 2.1.2).
 */
const CodeEditor = ({ value, onChange, label = 'Code editor (main.py)' }: CodeEditorProps) => {
  const [tabExits, setTabExits] = useState(false);
  const editorId = useId();
  const helpId = useId();

  // The editor renders its own textarea; link it to the keyboard help text.
  useEffect(() => {
    document.getElementById(editorId)?.setAttribute('aria-describedby', helpId);
  }, [editorId, helpId]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault(); // keep focus here; the library would otherwise blur
      setTabExits(true);
    } else if (e.key !== 'Tab' && e.key !== 'Shift') {
      setTabExits(false);
    }
  };

  return (
    <div className="editor-wrapper">
      <label className="editor-label" htmlFor={editorId}>{label}</label>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={(c) => Prism.highlight(c, Prism.languages.python, 'python')}
        padding={16}
        className="code-editor"
        textareaId={editorId}
        textareaClassName="code-input"
        ignoreTabKey={tabExits}
        onKeyDown={onKeyDown}
        onBlur={() => setTabExits(false)}
      />
      <p id={helpId} className="editor-help">
        {tabExits ? 'Tab now moves focus out of the editor.' : 'Tab inserts spaces. Press Esc, then Tab, to leave the editor.'}
      </p>
    </div>
  );
};

export default CodeEditor;
