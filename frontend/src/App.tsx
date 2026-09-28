import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { arrayUnion, deleteField, doc, FieldPath, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { about, getLesson, getUnit, lessons, units } from './data/lessons';
import type { UserProgress } from './types/lesson';
import { summarize, type GameSummary } from './game/summary';
import { BADGES } from './game/badges';
import { lessonXp, LESSON_COMPLETE_BONUS } from './game/xp';
import {
  EMPTY_PROGRESS,
  PROGRESS_VERSION,
  fromDoc,
  isLessonComplete,
  isStepDone,
  resumeIndex,
  toDoc,
  withStepDone,
  withoutLesson,
  type ProgressDoc,
} from './game/progress';
import { reportError } from './monitoring';
import SkillMap from './components/SkillMap';
import AuthForm from './components/AuthForm';
import Hud from './components/Hud';
import Toasts, { type Toast } from './components/Toasts';
import CourseAbout from './components/CourseAbout';
import ErrorBoundary from './components/ErrorBoundary';
import SaveStatus, { type SaveState } from './components/SaveStatus';

// Loaded on demand so the first page (sign-in and map) downloads less.
const StepView = lazy(() => import('./components/StepView'));
const TrophyCase = lazy(() => import('./components/TrophyCase'));

const USER_PROGRESS_COLLECTION = 'user_progress';
const TOAST_MS = 6000;

type View = { name: 'map' } | { name: 'trophies' } | { name: 'lesson'; lessonId: string };

const Loading = () => (
  <div className="loading-state" role="status">
    Loading…
  </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ name: 'map' });
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState<UserProgress>(EMPTY_PROGRESS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  // Mirrors progress so callbacks always see the latest value.
  const progressRef = useRef<UserProgress>(EMPTY_PROGRESS);
  const toastId = useRef(0);
  const hasSaved = useRef(false);

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

  /** Writes to Firestore and surfaces failures instead of only logging them. */
  const write = useCallback((op: Promise<unknown>, context: string) => {
    hasSaved.current = true;
    setSaveState(navigator.onLine ? 'saving' : 'offline');
    op.catch((error) => {
      setSaveState('error');
      reportError(error, { context });
    });
  }, []);

  // --- ONLINE / OFFLINE ---
  useEffect(() => {
    const update = () => {
      if (!hasSaved.current) return;
      setSaveState((s) => (!navigator.onLine ? 'offline' : s === 'offline' ? 'saving' : s));
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // --- AUTH + LIVE PROGRESS (with one-time migration of old progress) ---
  useEffect(() => {
    let unsubscribeProgress: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeProgress?.();
      unsubscribeProgress = undefined;
      setUser(currentUser);
      setLoading(false);
      hasSaved.current = false;
      setSaveState('idle');

      if (!currentUser) {
        applyProgress(EMPTY_PROGRESS);
        setView({ name: 'map' });
        return;
      }

      const ref = doc(db, USER_PROGRESS_COLLECTION, currentUser.uid);
      let migrated = false;
      unsubscribeProgress = onSnapshot(
        ref,
        { includeMetadataChanges: true },
        (snap) => {
          const { progress: next, needsMigration } = fromDoc(snap.data() as ProgressDoc | undefined);
          applyProgress(next);
          if (needsMigration && !migrated) {
            // Rewrite old position-based progress as step ids. Old fields stay for rollback.
            migrated = true;
            setDoc(ref, toDoc(next), { merge: true }).catch((error) => reportError(error, { context: 'migrate progress' }));
          }
          if (hasSaved.current) {
            if (snap.metadata.hasPendingWrites) setSaveState(navigator.onLine ? 'saving' : 'offline');
            else setSaveState((s) => (s === 'error' ? s : 'saved'));
          }
        },
        (error) => {
          setSaveState('error');
          reportError(error, { context: 'progress listener' });
        },
      );
    });

    return () => {
      unsubscribeProgress?.();
      unsubscribeAuth();
    };
  }, []);

  // --- PROGRESS SAVING (each step counts once, so XP can't be farmed by replaying) ---
  const completeStep = useCallback(
    (lessonId: string, stepId: string, firstTry: boolean) => {
      if (!user) return;
      const prev = progressRef.current;
      if (isStepDone(prev, lessonId, stepId)) return;

      const next = withStepDone(prev, lessonId, stepId, firstTry);
      applyProgress(next);

      const lesson = getLesson(lessonId);
      const justFinished = lesson && isLessonComplete(next, lesson) ? lesson.title : undefined;
      announceRewards(summarize(lessons, prev), summarize(lessons, next), justFinished);

      const update: Record<string, unknown> = {
        version: PROGRESS_VERSION,
        done: { [lessonId]: arrayUnion(stepId) },
      };
      if (firstTry) update.first_try_ids = { [lessonId]: arrayUnion(stepId) };
      write(setDoc(doc(db, USER_PROGRESS_COLLECTION, user.uid), update, { merge: true }), 'save step');
    },
    [user, announceRewards, write],
  );

  const resetLessonProgress = (lessonId: string) => {
    if (!user) return;
    const title = getLesson(lessonId)?.title ?? 'this lesson';
    if (!window.confirm(`Reset your progress for ${title}? The XP from this lesson will be removed.`)) return;

    applyProgress(withoutLesson(progressRef.current, lessonId));
    if (currentLesson?.id === lessonId) setStepIndex(0);
    write(
      updateDoc(
        doc(db, USER_PROGRESS_COLLECTION, user.uid),
        new FieldPath('done', lessonId),
        deleteField(),
        new FieldPath('first_try_ids', lessonId),
        deleteField(),
      ),
      'reset lesson',
    );
  };

  const resetAllProgress = () => {
    if (!user) return;
    if (!window.confirm('This permanently erases ALL your progress, XP, and trophies. Are you sure?')) return;

    applyProgress(EMPTY_PROGRESS);
    setStepIndex(0);
    // No merge: replaces the whole document, including any old-format fields.
    write(setDoc(doc(db, USER_PROGRESS_COLLECTION, user.uid), toDoc(EMPTY_PROGRESS)), 'reset all');
  };

  // --- NAVIGATION ---
  const openLesson = (lessonId: string) => {
    const lesson = getLesson(lessonId);
    if (!lesson) return;
    setStepIndex(resumeIndex(progressRef.current, lesson));
    setView({ name: 'lesson', lessonId });
  };

  const nextStep = (firstTry: boolean) => {
    if (!currentLesson) return;
    const step = currentLesson.steps[stepIndex];
    if (step) completeStep(currentLesson.id, step.id, firstTry);
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

  const backToMap = () => setView({ name: 'map' });

  if (loading) return <Loading />;

  const currentStep = currentLesson?.steps[stepIndex];

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
          <>
            <Hud summary={summary} totalLessons={lessons.length} onOpenTrophies={() => setView({ name: 'trophies' })} />
            <SaveStatus state={saveState} />
          </>
        )}

        <main id="main" className="app-main" tabIndex={-1}>
          <ErrorBoundary key={view.name === 'lesson' ? view.lessonId : view.name} onReset={backToMap}>
            <Suspense fallback={<Loading />}>
              {!user ? (
                <>
                  <AuthForm />
                  <CourseAbout about={about} defaultOpen />
                </>
              ) : view.name === 'trophies' ? (
                <TrophyCase earned={summary.badges} onBack={backToMap} />
              ) : currentLesson ? (
                <StepView
                  key={`${currentLesson.id}:${stepIndex}`}
                  lesson={currentLesson}
                  stepIndex={stepIndex}
                  alreadyCompleted={!!currentStep && isStepDone(progress, currentLesson.id, currentStep.id)}
                  lessonXpEarned={lessonXp(currentLesson, progress)}
                  unit={getUnit(currentLesson.unit)}
                  unitComplete={lessons.filter((l) => l.unit === currentLesson.unit).every((l) => isLessonComplete(progress, l))}
                  courseComplete={summary.lessonsCompleted === lessons.length}
                  about={about}
                  onNext={nextStep}
                  onPrev={prevStep}
                  onBackToMenu={backToMap}
                  onRestart={restartLesson}
                />
              ) : (
                <SkillMap
                  about={about}
                  units={units}
                  lessons={lessons}
                  progress={progress}
                  onOpenLesson={openLesson}
                  onResetLesson={resetLessonProgress}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default App;
