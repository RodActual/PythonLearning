import { useCallback, useEffect, useState } from 'react';

/**
 * Hash routes, so browser Back/Forward, refresh, and bookmarks keep the learner's place
 * without any server rewrites. Lesson steps are 1-based in the URL; one past the last step
 * is the completion screen.
 */
export type Route =
  | { name: 'home'; unitId?: string }
  | { name: 'lesson'; lessonId: string; step?: number }
  | { name: 'pretest'; unitId: string }
  | { name: 'review' }
  | { name: 'playground' }
  | { name: 'progress' }
  | { name: 'trophies' }
  | { name: 'not-found' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [head, a, b] = parts;
  if (!head) return { name: 'home' };
  if (head === 'unit' && a && parts.length === 2) return { name: 'home', unitId: a };
  if (head === 'lesson' && a && parts.length <= 3) {
    if (b === undefined) return { name: 'lesson', lessonId: a };
    const step = Number(b);
    return Number.isInteger(step) && step >= 1 ? { name: 'lesson', lessonId: a, step } : { name: 'not-found' };
  }
  if (head === 'pretest' && a && parts.length === 2) return { name: 'pretest', unitId: a };
  if (parts.length === 1 && (head === 'review' || head === 'playground' || head === 'progress' || head === 'trophies')) {
    return { name: head };
  }
  return { name: 'not-found' };
}

export function toHash(route: Route): string {
  const e = encodeURIComponent;
  switch (route.name) {
    case 'home':
      return route.unitId ? `#/unit/${e(route.unitId)}` : '#/';
    case 'lesson':
      return route.step ? `#/lesson/${e(route.lessonId)}/${route.step}` : `#/lesson/${e(route.lessonId)}`;
    case 'pretest':
      return `#/pretest/${e(route.unitId)}`;
    case 'not-found':
      return '#/';
    default:
      return `#/${route.name}`;
  }
}

/** Current route plus a navigate function. `replace` swaps the history entry instead of adding one. */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    // popstate covers Back/Forward; hashchange covers typed URLs and plain links.
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const navigate = useCallback((next: Route, { replace = false } = {}) => {
    const hash = toHash(next);
    if (hash !== window.location.hash) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', hash);
    }
    setRoute(next);
  }, []);

  return [route, navigate] as const;
}
