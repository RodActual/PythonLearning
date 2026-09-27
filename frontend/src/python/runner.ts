import type { RunRequest, WorkerResponse } from './protocol';

export interface RunResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

type Resolver = (result: RunResult) => void;

/** Owns the Pyodide worker: lazy start, one shared runtime, kill-and-restart on timeout. */
class PythonRunner {
  private worker: Worker | null = null;
  private readyPromise: Promise<void> | null = null;
  private pending = new Map<number, Resolver>();
  private nextId = 1;

  /** Starts loading Python if needed. Resolves once code can run. */
  ready(): Promise<void> {
    if (!this.readyPromise) this.start();
    return this.readyPromise!;
  }

  async run(code: string, timeoutMs = 10_000): Promise<RunResult> {
    await this.ready();
    const id = this.nextId++;
    return new Promise<RunResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.reset();
        resolve({
          stdout: '',
          stderr: `Stopped: your code ran longer than ${timeoutMs / 1000} seconds. Check for an infinite loop.`,
          timedOut: true,
        });
      }, timeoutMs);
      this.pending.set(id, (result) => {
        clearTimeout(timer);
        resolve(result);
      });
      const request: RunRequest = { id, code };
      this.worker!.postMessage(request);
    });
  }

  private start(): void {
    const worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url));
    this.worker = worker;
    const readyPromise = new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'ready') resolve();
        else if (msg.type === 'init-error') reject(new Error(msg.message));
        else {
          const done = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          done?.({ stdout: msg.stdout, stderr: msg.stderr, timedOut: false });
        }
      };
      worker.onerror = (event) => reject(new Error(event.message || 'Python failed to load'));
    });
    this.readyPromise = readyPromise;
    // A failed load clears state so the next attempt starts fresh.
    readyPromise.catch(() => {
      if (this.readyPromise === readyPromise) this.reset();
    });
  }

  private reset(): void {
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
    for (const done of this.pending.values()) {
      done({ stdout: '', stderr: 'Python was restarted.', timedOut: false });
    }
    this.pending.clear();
  }
}

export const pythonRunner = new PythonRunner();
