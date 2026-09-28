// Test double for firebase/auth. window.__MOCK_LOGGED_OUT starts signed out.
type Listener = (user: unknown) => void;
const w = window as unknown as { __MOCK_LOGGED_OUT?: boolean; __resetEmails?: string[] };
const USER = { uid: 'u1', email: 'learner@example.com' };
let listener: Listener | null = null;
let current: unknown = w.__MOCK_LOGGED_OUT ? null : USER;

export type User = typeof USER;
export const getAuth = () => ({});
export const onAuthStateChanged = (_auth: unknown, cb: Listener) => {
  listener = cb;
  setTimeout(() => cb(current), 0);
  return () => {
    listener = null;
  };
};
export const signOut = async () => {
  current = null;
  listener?.(null);
};
export const signInWithEmailAndPassword = async () => {
  current = USER;
  listener?.(USER);
};
export const createUserWithEmailAndPassword = signInWithEmailAndPassword;
export const sendPasswordResetEmail = async (_auth: unknown, email: string) => {
  (w.__resetEmails ??= []).push(email);
};
