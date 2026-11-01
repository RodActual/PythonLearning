import { useId } from 'react';

/** Segmented progress bar for a review or pretest session. */
export function SessionProgress({ label, unit, index, total }: { label: string; unit: string; index: number; total: number }) {
  return (
    <div
      className="step-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={index}
      aria-valuetext={`${unit} ${index + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`seg ${i < index ? 'done' : i === index ? 'current' : ''}`} />
      ))}
    </div>
  );
}

interface SessionNavProps {
  label: string;
  /** Shown while unanswered; omitted means no skip button. */
  skipLabel?: string;
  onSkip: () => void;
  /** Why Next is disabled, shown while unanswered. */
  hint: string;
  answered: boolean;
  nextLabel: string;
  onNext: () => void;
}

/** Skip and Next controls: Next stays aria-disabled, with a hint, until the card is answered. */
export function SessionNav({ label, skipLabel, onSkip, hint, answered, nextLabel, onNext }: SessionNavProps) {
  const hintId = useId();
  return (
    <nav className="lesson-nav-controls" aria-label={label}>
      {!answered && skipLabel ? (
        <button type="button" className="secondary-button" onClick={onSkip}>
          {skipLabel}
        </button>
      ) : (
        <span />
      )}
      <div className="next-wrap">
        {!answered && (
          <span id={hintId} className="next-hint">
            {hint}
          </span>
        )}
        <button
          type="button"
          className="primary-button"
          aria-disabled={!answered || undefined}
          aria-describedby={!answered ? hintId : undefined}
          onClick={() => answered && onNext()}
        >
          {nextLabel}<span aria-hidden="true"> →</span>
        </button>
      </div>
    </nav>
  );
}
