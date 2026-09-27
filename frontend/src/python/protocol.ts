export interface RunRequest {
  id: number;
  code: string;
}

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'init-error'; message: string }
  | { type: 'result'; id: number; stdout: string; stderr: string };
