export type TaskState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TaskStatus {
  taskId: string;
  progress: number;
  state: TaskState;
  message?: string;
  error?: string;
  updatedAt?: string;
}
