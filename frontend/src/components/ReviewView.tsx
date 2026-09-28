import { useId, useState } from 'react';
import type { Lesson, UserProgress } from '../types/lesson';
import { buildSession, dueItems, nextCard, nextDueDate, reviewItems, whenLabel, type ReviewItem } from '../game/review';
import { useDocumentTitle, useFocusOnMount } from '../a11y/hooks';
import Quiz from './Quiz';
import CodeSandbox from './CodeSandbox';
import RichText from './RichText';

interface ReviewViewProps {
  lessons: Lesson[];
  progress: UserProgress;
  /** Saves the result of one scheduled review. Not called in practice mode. */
  onResult: (key: string, correct: boolean) => void;
  onBackToMap: () => void;
}

interface Result {
  item: ReviewItem;
  correct: boolean;
  nextDue?: string;
}

type Phase = { name: 'intro' } | { name: 'session'; items: ReviewItem[]; practice: boolean } | { name: 'summary'; results: Result[]; practice: boolean };

function Intro({ lessons, progress, onStart, onBackToMap }: {
  lessons: Lesson[];
  progress: UserProgress;
  onStart: (items: ReviewItem[], practice: boolean) => void;
  onBackToMap: () => void;
}) {
  useDocumentTitle('Review');
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const all = reviewItems(lessons, progress);
  const due = dueItems(all);
  const next = nextDueDate(all);

  return (
    <div className="review-intro">
      <h2 ref={headingRef} tabIndex={-1}>Review</h2>
      <p className="muted">
        Short mixed sessions of questions and challenges from lessons you've finished. Answer right on the first try and
        a card comes back later and later (3, 7, 14, then 30 days). Miss it and it comes back tomorrow.
      </p>

      {all.length === 0 ? (
        <div className="review-empty">
          <p>Nothing to review yet. Complete some quizzes or coding challenges and they'll show up here.</p>
          <button type="button" className="primary-button" onClick={onBackToMap}>Go to the map</button>
        </div>
      ) : due.length > 0 ? (
        <div className="review-start">
          <p className="review-count">
            <strong>{due.length}</strong> {due.length === 1 ? 'card is' : 'cards are'} due. A session covers up to 10.
          </p>
          <button type="button" className="primary-button" onClick={() => onStart(buildSession(due), false)}>
            Start review
          </button>
        </div>
      ) : (
        <div className="review-start">
          <p className="review-count">
            <span aria-hidden="true">✅ </span>You're all caught up.
            {next && <> Next review {whenLabel(next)}.</>}
          </p>
          <button type="button" className="secondary-button" onClick={() => onStart(buildSession(all, { size: 5 }), true)}>
            Practice anyway
          </button>
          <p className="muted small">Practice doesn't change your review schedule.</p>
        </div>
      )}
      <p className="muted small">{all.length} cards in your deck.</p>
    </div>
  );
}

function Session({ items, practice, onFinish, onResult, onQuit }: {
  items: ReviewItem[];
  practice: boolean;
  onFinish: (results: Result[]) => void;
  onResult: (key: string, correct: boolean) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const hintId = useId();
  const item = items[index];
  useDocumentTitle(`Review ${index + 1} of ${items.length}`);

  const record = (correct: boolean) => {
    const result: Result = { item, correct, nextDue: practice ? undefined : nextCard(item.card, correct).due };
    if (!practice) onResult(item.key, correct);
    const all = [...results, result];
    setResults(all);
    setOutcome(null);
    if (index + 1 >= items.length) onFinish(all);
    else setIndex(index + 1);
  };

  const skip = () => record(false);

  return (
    <div className="review-session">
      <h2 className="visually-hidden">{practice ? 'Practice session' : 'Review session'}</h2>
      <div className="top-controls">
        <button type="button" className="secondary-button" onClick={onQuit}>
          <span aria-hidden="true">← </span>End session
        </button>
        {practice && <span className="chip chip-next">Practice</span>}
      </div>
      <div
        className="step-progress"
        role="progressbar"
        aria-label="Review progress"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={index}
        aria-valuetext={`Card ${index + 1} of ${items.length}`}
      >
        {items.map((_, i) => (
          <span key={i} className={`seg ${i < index ? 'done' : i === index ? 'current' : ''}`} />
        ))}
      </div>
      <ReviewCardView key={item.key + index} item={item} index={index} total={items.length} onAnswered={setOutcome} />
      <nav className="lesson-nav-controls" aria-label="Review navigation">
        {item.step.type === 'code' && outcome === null ? (
          <button type="button" className="secondary-button" onClick={skip}>
            Skip (counts as a miss)
          </button>
        ) : (
          <span />
        )}
        <div className="next-wrap">
          {outcome === null && (
            <span id={hintId} className="next-hint">
              {item.step.type === 'quiz' ? 'Choose the correct answer to continue.' : 'Pass the challenge or skip it.'}
            </span>
          )}
          <button
            type="button"
            className="primary-button"
            aria-disabled={outcome === null || undefined}
            aria-describedby={outcome === null ? hintId : undefined}
            onClick={() => outcome !== null && record(outcome)}
          >
            {index + 1 >= items.length ? 'Finish' : 'Next card'}<span aria-hidden="true"> →</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function ReviewCardView({ item, index, total, onAnswered }: {
  item: ReviewItem;
  index: number;
  total: number;
  onAnswered: (correct: boolean) => void;
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { step, lesson } = item;
  return (
    <div className={`step-card step-${step.type}`}>
      <h3 ref={headingRef} tabIndex={-1} className="step-heading">
        <span className="step-kicker">
          Card {index + 1} of {total} · {step.type === 'code' ? 'Coding challenge' : step.code ? 'Predict the output' : 'Quiz'}
        </span>
        <span className="review-source">From: {lesson.title}</span>
      </h3>
      {step.type === 'quiz' ? (
        <Quiz step={step} onSolved={onAnswered} />
      ) : (
        <div className="code-section">
          <p className="task"><strong>Task:</strong> <RichText text={step.instruction} /></p>
          <CodeSandbox
            initialCode={step.initial_code}
            expectedOutput={step.expected_output}
            expectedError={step.expected_error}
            hint={step.hint}
            onPass={onAnswered}
          />
        </div>
      )}
    </div>
  );
}

function Summary({ results, practice, onAgain, onBackToMap }: {
  results: Result[];
  practice: boolean;
  onAgain: () => void;
  onBackToMap: () => void;
}) {
  useDocumentTitle('Review complete');
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const right = results.filter((r) => r.correct).length;
  return (
    <div className="review-summary">
      <h2 ref={headingRef} tabIndex={-1}>{practice ? 'Practice complete' : 'Review complete'}</h2>
      <p className="completion-xp">
        {right} of {results.length} right on the first try
      </p>
      <ul className="review-results">
        {results.map((r, i) => (
          <li key={i} className={r.correct ? 'result-right' : 'result-missed'}>
            <span aria-hidden="true">{r.correct ? '✓ ' : '↻ '}</span>
            <span className="visually-hidden">{r.correct ? 'Right: ' : 'Missed: '}</span>
            <span className="result-title">
              {r.item.step.type === 'code' ? r.item.step.heading ?? 'Coding challenge' : r.item.step.question}
            </span>
            <span className="result-meta">
              {r.item.lesson.title}
              {r.nextDue && <> · back {whenLabel(r.nextDue)}</>}
            </span>
          </li>
        ))}
      </ul>
      <div className="completion-actions">
        <button type="button" className="primary-button" onClick={onBackToMap}>Back to the map</button>
        <button type="button" className="secondary-button" onClick={onAgain}>Review menu</button>
      </div>
    </div>
  );
}

const ReviewView = ({ lessons, progress, onResult, onBackToMap }: ReviewViewProps) => {
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });

  if (phase.name === 'session') {
    return (
      <Session
        items={phase.items}
        practice={phase.practice}
        onResult={onResult}
        onFinish={(results) => setPhase({ name: 'summary', results, practice: phase.practice })}
        onQuit={() => setPhase({ name: 'intro' })}
      />
    );
  }
  if (phase.name === 'summary') {
    return (
      <Summary
        results={phase.results}
        practice={phase.practice}
        onAgain={() => setPhase({ name: 'intro' })}
        onBackToMap={onBackToMap}
      />
    );
  }
  return (
    <Intro
      lessons={lessons}
      progress={progress}
      onStart={(items, practice) => setPhase({ name: 'session', items, practice })}
      onBackToMap={onBackToMap}
    />
  );
};

export default ReviewView;
