import { useEffect, useRef, useState } from 'react';
import type { TaskStatus } from '../types/task';
import { useApi } from './useApi';

interface UseTaskUpdatesOptions {
  pollingInterval?: number;
  taskIds: string[];
}

export function useTaskUpdates({ pollingInterval = 5000, taskIds }: UseTaskUpdatesOptions) {
  const api = useApi();
  const [tasks, setTasks] = useState<Record<string, TaskStatus>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const wsUrl = import.meta.env.VITE_WS_BASE_URL;

  useEffect(() => {
    let isMounted = true;

    async function fetchStatuses() {
      if (!taskIds.length) {
        return;
      }
      try {
        await Promise.all(
          taskIds.map(async (taskId) => {
            const { data } = await api.get(`/tasks/${taskId}`);
            if (isMounted) {
              setTasks((prev) => ({ ...prev, [taskId]: data }));
            }
          })
        );
      } catch (error) {
        console.error('Failed to fetch task status', error);
      }
    }

    fetchStatuses();
    const timer = setInterval(fetchStatuses, pollingInterval);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [api, pollingInterval, taskIds]);

  useEffect(() => {
    if (!wsUrl || !taskIds.length) {
      return undefined;
    }
    const ws = new WebSocket(`${wsUrl}/tasks`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as TaskStatus;
      if (taskIds.includes(payload.taskId)) {
        setTasks((prev) => ({ ...prev, [payload.taskId]: payload }));
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [taskIds, wsUrl]);

  const cancelTask = async (taskId: string) => {
    await api.post(`/tasks/${taskId}/cancel`);
  };

  const retryTask = async (taskId: string) => {
    await api.post(`/tasks/${taskId}/retry`);
  };

  return { tasks, cancelTask, retryTask };
}
