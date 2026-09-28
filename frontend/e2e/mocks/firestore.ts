// In-memory test double for the parts of firebase/firestore the app uses.
// window.__MOCK_STORE seeds the progress document; window.__store exposes it to tests.
// window.__MOCK_FAIL_WRITES makes writes reject; window.__MOCK_PENDING keeps writes "pending".
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = window as any;
w.__store = w.__MOCK_STORE ? JSON.parse(JSON.stringify(w.__MOCK_STORE)) : undefined;
w.__writes = 0;

const DELETE = { __delete: true };
class Union {
  constructor(public items: unknown[]) {}
}
export class FieldPath {
  segments: string[];
  constructor(...segments: string[]) {
    this.segments = segments;
  }
}

type Snapshot = { data: () => unknown; metadata: { hasPendingWrites: boolean } };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const snapshot = (): Snapshot => ({
  data: () => (w.__store === undefined ? undefined : JSON.parse(JSON.stringify(w.__store))),
  metadata: { hasPendingWrites: !!w.__MOCK_PENDING },
});

function merge(target: any, src: any) {
  for (const [k, v] of Object.entries(src)) {
    if (v === DELETE) delete target[k];
    else if (v instanceof Union) target[k] = [...new Set([...(target[k] ?? []), ...v.items])];
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = target[k] && typeof target[k] === 'object' ? target[k] : {};
      merge(target[k], v);
    } else target[k] = v;
  }
}

const maybeFail = async () => {
  if (w.__MOCK_FAIL_WRITES) throw new Error('permission-denied (mock)');
};

export const initializeFirestore = () => ({});
export const getFirestore = () => ({});
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const doc = (_db: unknown, ...path: string[]) => path.join('/');
export const deleteField = () => DELETE;
export const arrayUnion = (...items: unknown[]) => new Union(items);

export function onSnapshot(_ref: string, ...args: any[]) {
  const [next, error] = typeof args[0] === 'function' ? args : [args[1], args[2]];
  void error;
  const l = () => next(snapshot());
  listeners.add(l);
  setTimeout(l, 0);
  return () => listeners.delete(l);
}

export async function setDoc(_ref: string, data: any, opts?: { merge?: boolean }) {
  await maybeFail();
  if (!opts?.merge || w.__store === undefined) w.__store = opts?.merge ? (w.__store ?? {}) : {};
  merge(w.__store, data);
  w.__writes += 1;
  emit();
}

export async function updateDoc(_ref: string, ...args: any[]) {
  await maybeFail();
  for (let i = 0; i < args.length; i += 2) {
    const segs: string[] = args[i].segments;
    let t = w.__store;
    for (const s of segs.slice(0, -1)) t = t[s] ?? (t[s] = {});
    const last = segs[segs.length - 1];
    if (args[i + 1] === DELETE) delete t[last];
    else t[last] = args[i + 1];
  }
  w.__writes += 1;
  emit();
}
