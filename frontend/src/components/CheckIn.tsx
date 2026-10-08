import { useEffect, useRef, useState } from 'react';
import CodeBlock from './CodeBlock';
import RichText from './RichText';
import type { SupportTier } from '../types/lesson';

interface CheckInProps {
  /** One or two tiers of extra explanation, shown one at a time while the learner feels unsure. */
  tiers: SupportTier[];
  onReady: () => void;
  /** Called when the learner is still unsure after every tier. */
  onRestartLesson: () => void;
}

/**
 * Asks how the learner feels before an exercise. "Unsure" reveals the next tier of extra
 * explanation; still unsure after the last tier offers a fresh start from step 1.
 */
function CheckIn({ tiers, onReady, onRestartLesson }: CheckInProps) {
  const [shown, setShown] = useState(0);
  const [outOfTiers, setOutOfTiers] = useState(false);
  const focusRef = useRef<HTMLHeadingElement>(null);

  // Move focus to whatever was just revealed, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (shown > 0 || outOfTiers) focusRef.current?.focus();
  }, [shown, outOfTiers]);

  const unsure = () => {
    if (shown < tiers.length) setShown(shown + 1);
    else setOutOfTiers(true);
  };

  return (
    <section className="check-in" aria-label="Check-in before the exercise">
      {tiers.slice(0, shown).map((tier, i) => (
        <div key={i} className="support-tier">
          <h4 ref={i === shown - 1 && !outOfTiers ? focusRef : undefined} tabIndex={-1} className="support-heading">
            <span className="support-kicker">{i === 0 ? 'Another way to see it' : 'Step by step'}</span>
            {tier.heading}
          </h4>
          <p><RichText text={tier.content} /></p>
          {tier.example_code && <CodeBlock code={tier.example_code} />}
        </div>
      ))}

      {outOfTiers ? (
        <div className="check-in-card">
          <h4 ref={focusRef} tabIndex={-1} className="check-in-question">Let's start this lesson over</h4>
          <p>
            That's completely fine. Going through the lesson again from step 1 usually makes it click. Your saved
            progress and XP are kept.
          </p>
          <div className="check-in-actions">
            <button type="button" className="primary-button" onClick={onRestartLesson}>
              Restart the lesson
            </button>
          </div>
        </div>
      ) : (
        <div className="check-in-card">
          <p className="check-in-question">
            <span aria-hidden="true">🧭 </span>
            {shown === 0 ? 'Check-in: how are you feeling about this before you try it?' : 'How about now?'}
          </p>
          <div className="check-in-actions">
            <button type="button" className="primary-button" onClick={onReady}>
              {shown === 0 ? "Feeling good, let's try it" : "That helped, let's try it"}
            </button>
            <button type="button" className="secondary-button" onClick={unsure}>
              {shown === 0 ? 'Not sure yet' : 'Still unsure'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default CheckIn;
