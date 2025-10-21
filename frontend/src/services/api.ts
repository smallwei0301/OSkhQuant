import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import type { BacktestFormValues, BacktestResponse } from '../types/backtest';
import type { TaskStatus } from '../types/task';
import type { ResultsResponse } from '../types/results';

export function useDownloadData() {
  const api = useApi();
  return useMutation(async (payload: Record<string, unknown>) => {
    const { data } = await api.post<{ taskId: string }>('/data/download', payload);
    return data;
  });
}

export function useTaskDetails(taskId: string) {
  const api = useApi();
  return useQuery<TaskStatus>({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${taskId}`);
      return data;
    },
    enabled: Boolean(taskId)
  });
}

export function useBacktestRun() {
  const api = useApi();
  return useMutation(async (values: BacktestFormValues) => {
    const formData = new FormData();
    formData.append('strategyName', values.strategyName);
    formData.append('symbolList', JSON.stringify(values.symbolList));
    formData.append('startDate', values.startDate);
    formData.append('endDate', values.endDate);
    formData.append('positionSizing', values.positionSizing);
    formData.append('slippage', values.slippage.toString());
    formData.append('commission', values.commission.toString());
    formData.append('rsi', JSON.stringify(values.rsi));
    formData.append('capital', JSON.stringify(values.capital));
    values.files.forEach((file) => formData.append('files', file));
    const { data } = await api.post<BacktestResponse>('/backtest/run', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  });
}

export function useBacktestResults(taskId: string) {
  const api = useApi();
  return useQuery<ResultsResponse>({
    queryKey: ['results', taskId],
    queryFn: async () => {
      const { data } = await api.get(`/backtest/results/${taskId}`);
      return data;
    },
    enabled: Boolean(taskId)
  });
}
