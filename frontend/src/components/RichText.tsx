import { Fragment, type ReactNode } from 'react';

/** Renders the lesson text subset we use: `inline code` and **bold**. Everything else is plain text. */
export default function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  const nodes: ReactNode[] = parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 3) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <Fragment key={i}>{part}</Fragment>;
  });
  return <>{nodes}</>;
}
