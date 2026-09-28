export type SaveState = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

const LABEL: Record<Exclude<SaveState, 'idle'>, { icon: string; text: string }> = {
  saving: { icon: '⏳', text: 'Saving…' },
  saved: { icon: '✓', text: 'Progress saved' },
  offline: { icon: '📴', text: "Offline: progress will sync when you're back online" },
  error: { icon: '⚠️', text: "Couldn't save progress. Check your connection." },
};

/** Always-present live region so screen readers hear save problems. */
const SaveStatus = ({ state }: { state: SaveState }) => (
  <p className={`save-status save-${state}`} role="status" aria-live="polite">
    {state !== 'idle' && (
      <>
        <span aria-hidden="true">{LABEL[state].icon} </span>
        {LABEL[state].text}
      </>
    )}
  </p>
);

export default SaveStatus;
