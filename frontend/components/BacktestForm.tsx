import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  useToast
} from '@chakra-ui/react';
import { FormEventHandler, useCallback, useState } from 'react';
import useSWR from 'swr';

import { createBacktest, fetchStrategies } from '../lib/api';

type Strategy = {
  id: number;
  name: string;
};

function BacktestForm() {
  const toast = useToast();
  const { data: strategies } = useSWR<Strategy[]>(['strategies-options'], () => fetchStrategies());
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      strategy_id: Number(formData.get('strategy_id')),
      start_date: new Date(String(formData.get('start_date'))).toISOString(),
      end_date: new Date(String(formData.get('end_date'))).toISOString(),
      parameters_override: {}
    };

    try {
      setSubmitting(true);
      const response = await createBacktest(payload);
      toast({
        title: '回測已建立',
        description: `任務編號：${response.task_id}`,
        status: 'success',
        position: 'top',
        duration: 5000
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '回測建立失敗';
      toast({ title: '回測建立失敗', description: message, status: 'error', position: 'top' });
    } finally {
      setSubmitting(false);
    }
  }, [toast]);

  return (
    <Box as="section" bg="white" borderRadius="lg" shadow="sm" p={6}>
      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <FormControl isRequired>
            <FormLabel>策略</FormLabel>
            <Select name="strategy_id" placeholder="請選擇策略">
              {strategies?.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>回測開始日期</FormLabel>
            <Input name="start_date" type="date" />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>回測結束日期</FormLabel>
            <Input name="end_date" type="date" />
          </FormControl>
          <Button type="submit" colorScheme="teal" isLoading={isSubmitting} isDisabled={!strategies}>
            建立回測任務
          </Button>
        </Stack>
      </form>
    </Box>
  );
}

export default BacktestForm;
