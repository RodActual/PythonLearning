import { useId, useState } from 'react';
import RichText from './RichText';
import CodeBlock from './CodeBlock';
import type { QuizStep } from '../types/lesson';

interface QuizProps {
  step: QuizStep;
  /** Text announcing the XP reward, or undefined when no XP is at stake. */
  rewardText?: (firstTry: boolean) => string;
  onSolved: (firstTry: boolean) => void;
}

const LETTERS = 'ABCDEFGH';

/** Multiple-choice question (or predict-the-output when the step has code). */
export default function Quiz({ step, rewardText, onSolved }: QuizProps) {
  const questionId = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const choose = (option: string) => {
    if (solved) return;
    const attempt = attempts + 1;
    setAttempts(attempt);
    setSelected(option);
    const correct = step.answer === undefined || option.trim() === step.answer.trim();
    if (correct) {
      setSolved(true);
      onSolved(attempt === 1);
    }
  };

  const firstTry = attempts === 1;
  let feedback = '';
  if (solved) {
    feedback = step.answer === undefined ? 'Thanks for answering!' : firstTry ? 'Correct!' : 'Correct, on a later try.';
    if (rewardText) feedback += ` ${rewardText(firstTry)}`;
  } else if (selected) {
    const why = step.feedback?.[selected];
    feedback = `Not quite. ${why ?? `"${selected}" is not right.`} Try another answer.`;
  }

  return (
    <div className="quiz-section">
      {step.code && (
        <div className="predict-code">
          <p className="predict-label">Read this code:</p>
          <CodeBlock code={step.code} />
        </div>
      )}
      <p id={questionId} className="question-text"><RichText text={step.question} /></p>
      <div className="options-grid" role="group" aria-labelledby={questionId}>
        {step.options.map((option, i) => {
          const isSelected = selected === option;
          const state = isSelected ? (solved ? 'correct' : 'incorrect') : '';
          return (
            <button
              key={option}
              type="button"
              className={`option-button ${state}`}
              onClick={() => choose(option)}
              aria-pressed={isSelected}
              aria-disabled={solved || undefined}
            >
              <span className="option-letter" aria-hidden="true">{LETTERS[i]}</span>
              <span className="option-text">{option}</span>
              {state && <span className="option-mark" aria-hidden="true">{state === 'correct' ? '✓' : '✗'}</span>}
            </button>
          );
        })}
      </div>
      <div className={`feedback ${solved ? 'feedback-good' : selected ? 'feedback-bad' : ''}`} role="status">
        {feedback && <p className="feedback-line">{feedback}</p>}
        {solved && step.explanation && (
          <p className="explanation"><strong>Why: </strong><RichText text={step.explanation} /></p>
        )}
      </div>
    </div>
  );
}
