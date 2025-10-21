import { useEffect, useState } from 'react';
import { Heading, Text, VStack } from '@chakra-ui/react';
import DataDownloadForm from '../components/DataDownloadForm';
import { loadTaskIds, saveTaskIds } from '../utils/taskStorage';

function DataDownloadPage() {
  const [submittedTaskIds, setSubmittedTaskIds] = useState<string[]>(() => loadTaskIds());

  useEffect(() => {
    saveTaskIds(submittedTaskIds);
  }, [submittedTaskIds]);

  const handleTaskCreated = (taskId: string) => {
    setSubmittedTaskIds((prev) => Array.from(new Set([taskId, ...prev])));
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Heading size="lg">資料下載表單</Heading>
      <Text color="gray.600">依需求選擇股票、週期與時間區間，系統會啟動背景任務下載資料。</Text>
      <DataDownloadForm onTaskCreated={handleTaskCreated} />
      {submittedTaskIds.length > 0 && (
        <Text color="gray.500">最新任務：{submittedTaskIds.join(', ')}</Text>
      )}
    </VStack>
  );
}

export default DataDownloadPage;
