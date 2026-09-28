// Test double for firebase/app used by the e2e build (see vite.e2e.config.ts).
export const initializeApp = () => ({});
export class FirebaseError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
