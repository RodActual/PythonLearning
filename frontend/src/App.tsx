import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { arrayUnion, deleteField, doc, FieldPath, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { getLesson, lessons, units } from './data/lessons';
import type { UserProgress } from './types/lesson';
import { summarize, type GameSummary } from './game/summary';
import { BADGES } from './game/badges';
import { lessonXp, LESSON_COMPLETE_BONUS } from './game/xp';
import SkillMap from './components/SkillMap';
import StepView from './components/StepView';
import AuthForm from './components/AuthForm';
import Hud from './components/Hud';
import TrophyCase from './components/TrophyCase';
import Toasts, { type Toast } from './components/Toasts';

const USER_PROGRESS_COLLECTION = 'user_progress';
const EMPTY: UserProgress = { completed_steps: {}, first_try: {} };
const TOAST_MS = 6000;

type View = { name: 'map' } | { name: 'trophies' } | { name: 'lesson'; lessonId: string };

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ name: 'map' });
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState<UserProgress>(EMPTY);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Mirrors progress so callbacks always see the latest value.
  const progressRef = useRef<UserProgress>(EMPTY);
  const toastId = useRef(0);

  const summary = summarize(lessons, progress);
  const currentLesson = view.name === 'lesson' ? getLesson(view.lessonId) : undefined;

  const applyProgress = (next: UserProgress) => {
    progressRef.current = next;
    setProgress(next);
  };

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const pushToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = ++toastId.current;
      setToasts((t) => [...t, { ...toast, id }]);
      setTimeout(() => dismissToast(id), TOAST_MS);
    },
    [dismissToast],
  );

  const announceRewards = useCallback(
    (before: GameSummary, after: GameSummary, completedLessonTitle?: string) => {
      if (completedLessonTitle) {
        pushToast({ tone: 'xp', icon: '🏁', title: `Lesson complete: ${completedLessonTitle}`, detail: `+${LESSON_COMPLETE_BONUS} XP bonus` });
      }
      if (after.level.level > before.level.level) {
        pushToast({ tone: 'level', icon: '⬆️', title: `Level up! Level ${after.level.level}`, detail: `You are now a ${after.level.title}.` });
      }
      for (const id of after.badges.filter((b) => !before.badges.includes(b))) {
        const badge = BADGES.find((b) => b.id === id);
        if (badge) pushToast({ tone: 'badge', icon: badge.icon, title: `Trophy unlocked: ${badge.name}`, detail: badge.description });
      }
    },
    [pushToast],
  );

  // --- AUTH + LIVE PROGRESS ---
  useEffect(() => {
    let unsubscribeProgress: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeProgress?.();
      unsubscribeProgress = undefined;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        unsubscribeProgress = onSnapshot(
          doc(db, USER_PROGRESS_COLLECTION, currentUser.uid),
          (snap) => {
            const data = snap.data() as Partial<UserProgress> | undefined;
            applyProgress({ completed_steps: data?.completed_steps ?? {}, first_try: data?.first_try ?? {} });
          },
          (error) => console.error('Progress listener error:', error),
        );
      } else {
        applyProgress(EMPTY);
        setView({ name: 'map' });
      }
    });

    return () => {
      unsubscribeProgress?.();
      unsubscribeAuth();
    };
  }, []);

  // --- PROGRESS SAVING (only ever moves forward, so XP can't be farmed by replaying) ---
  const saveProgress = useCallback(
    (lessonId: string, completedIndex: number, firstTry: boolean) => {
      if (!user) return;
      const reached = completedIndex + 1;
      const prev = progressRef.current;
      if (reached <= (prev.completed_steps[lessonId] ?? 0)) return;

      const next: UserProgress = {
        completed_steps: { ...prev.completed_steps, [lessonId]: reached },
        first_try: firstTry
          ? { ...prev.first_try, [lessonId]: [...(prev.first_try[lessonId] ?? []), completedIndex] }
          : prev.first_try,
      };
      applyProgress(next);

      const lesson = getLesson(lessonId);
      const justFinished = lesson && reached >= lesson.steps.length ? lesson.title : undefined;
      announceRewards(summarize(lessons, prev), summarize(lessons, next), justFinished);

      const update: Record<string, unknown> = { completed_steps: { [lessonId]: reached } };
      if (firstTry) update.first_try = { [lessonId]: arrayUnion(completedIndex) };
      setDoc(doc(db, USER_PROGRESS_COLLECTION, user.uid), update, { merge: true }).catch((error) =>
        console.error('Error saving progress:', error),
      );
    },
    [user, announceRewards],
  );

  const resetLessonProgress = async (lessonId: string) => {
    if (!user) return;
    const title = getLesson(lessonId)?.title ?? 'this lesson';
    if (!window.confirm(`Reset your progress for ${title}? The XP from this lesson will be removed.`)) return;

    const next: UserProgress = {
      completed_steps: { ...progressRef.current.completed_steps },
      first_try: { ...progressRef.current.first_try },
    };
    delete next.completed_steps[lessonId];
    delete next.first_try[lessonId];
    applyProgress(next);
    if (currentLesson?.id === lessonId) setStepIndex(0);

    try {
      await updateDoc(
        doc(db, USER_PROGRESS_COLLECTION, user.uid),
        new FieldPath('completed_steps', lessonId),
        deleteField(),
        new FieldPath('first_try', lessonId),
        deleteField(),
      );
    } catch (error) {
      console.error('Error resetting lesson:', error);
    }
  };

  const resetAllProgress = async () => {
    if (!user) return;
    if (!window.confirm('This permanently erases ALL your progress, XP, and trophies. Are you sure?')) return;

    applyProgress(EMPTY);
    setStepIndex(0);
    try {
      await setDoc(doc(db, USER_PROGRESS_COLLECTION, user.uid), EMPTY);
    } catch (error) {
      console.error('Error resetting all progress:', error);
    }
  };

  // --- NAVIGATION ---
  const openLesson = (lessonId: string) => {
    const lesson = getLesson(lessonId);
    if (!lesson) return;
    const saved = progressRef.current.completed_steps[lessonId] ?? 0;
    // Completed lessons reopen at the start for review.
    setStepIndex(saved >= lesson.steps.length ? 0 : saved);
    setView({ name: 'lesson', lessonId });
  };

  const nextStep = (firstTry: boolean) => {
    if (!currentLesson) return;
    saveProgress(currentLesson.id, stepIndex, firstTry);
    setStepIndex(Math.min(stepIndex + 1, currentLesson.steps.length));
  };

  const prevStep = () => setStepIndex((i) => Math.max(i - 1, 0));

  // Moves the cursor only; saved progress and XP are kept.
  const restartLesson = () => {
    if (window.confirm('Restart this lesson from step 1? Your saved progress and XP are kept.')) {
      setStepIndex(0);
      window.scrollTo(0, 0);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" role="status">
        Loading…
      </div>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="app-shell">
        <header className="app-header">
          <h1 className="app-title">
            <span aria-hidden="true">🐍 </span>Python Learning Path
          </h1>
          {user && (
            <div className="user-info">
              <span className="user-email">{user.email}</span>
              <button type="button" onClick={resetAllProgress} className="danger-button">Reset all progress</button>
              <button type="button" onClick={() => signOut(auth)} className="secondary-button">Log out</button>
            </div>
          )}
        </header>

        {user && (
          <Hud summary={summary} totalLessons={lessons.length} onOpenTrophies={() => setView({ name: 'trophies' })} />
        )}

        <main id="main" className="app-main" tabIndex={-1}>
          {!user ? (
            <AuthForm />
          ) : view.name === 'trophies' ? (
            <TrophyCase earned={summary.badges} onBack={() => setView({ name: 'map' })} />
          ) : currentLesson ? (
            <StepView
              key={`${currentLesson.id}:${stepIndex}`}
              lesson={currentLesson}
              stepIndex={stepIndex}
              alreadyCompleted={stepIndex < (progress.completed_steps[currentLesson.id] ?? 0)}
              lessonXpEarned={lessonXp(currentLesson, progress)}
              onNext={nextStep}
              onPrev={prevStep}
              onBackToMenu={() => setView({ name: 'map' })}
              onRestart={restartLesson}
            />
          ) : (
            <SkillMap units={units} lessons={lessons} progress={progress} onOpenLesson={openLesson} onResetLesson={resetLessonProgress} />
          )}
        </main>
      </div>
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default App;
