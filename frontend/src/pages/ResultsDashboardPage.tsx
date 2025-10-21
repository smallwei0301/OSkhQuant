import { useState } from 'react';
import { Heading, Text, VStack, Input, Button, HStack } from '@chakra-ui/react';
import { message } from 'antd';
import ResultsDashboard from '../components/ResultsDashboard';
import { useBacktestResults } from '../services/api';

function ResultsDashboardPage() {
  const [taskId, setTaskId] = useState('');
  const [queryTaskId, setQueryTaskId] = useState('');
  const { data: results, isFetching } = useBacktestResults(queryTaskId);

  const handleQuery = () => {
    if (!taskId) {
      message.warning('請先輸入任務 ID');
      return;
    }
    setQueryTaskId(taskId);
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Heading size="lg">結果儀表板</Heading>
      <Text color="gray.600">輸入任務 ID 後查看淨值曲線、回撤、成交紀錄與成本分析。</Text>
      <HStack spacing={4}>
        <Input placeholder="輸入任務 ID" value={taskId} onChange={(event) => setTaskId(event.target.value)} />
        <Button colorScheme="teal" onClick={handleQuery} isLoading={isFetching}>
          查詢
        </Button>
      </HStack>
      <ResultsDashboard results={results} />
    </VStack>
  );
}

export default ResultsDashboardPage;
