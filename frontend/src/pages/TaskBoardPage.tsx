import { useEffect, useState } from 'react';
import { Heading, Text, VStack, Input, Button, HStack } from '@chakra-ui/react';
import TaskBoard from '../components/TaskBoard';
import { loadTaskIds, saveTaskIds } from '../utils/taskStorage';

function TaskBoardPage() {
  const [inputTaskId, setInputTaskId] = useState('');
  const [taskIds, setTaskIds] = useState<string[]>(() => loadTaskIds());

  useEffect(() => {
    saveTaskIds(taskIds);
  }, [taskIds]);

  const addTaskId = () => {
    if (!inputTaskId) {
      return;
    }
    setTaskIds((prev) => Array.from(new Set([...prev, inputTaskId])));
    setInputTaskId('');
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Heading size="lg">任務看板</Heading>
      <Text color="gray.600">自動更新任務進度，可手動輸入任務 ID 或由表單帶入。</Text>
      <HStack spacing={4}>
        <Input
          placeholder="輸入任務 ID"
          value={inputTaskId}
          onChange={(event) => setInputTaskId(event.target.value)}
        />
        <Button colorScheme="teal" onClick={addTaskId}>
          加入
        </Button>
        <Button variant="outline" onClick={() => setTaskIds([])}>
          清空
        </Button>
      </HStack>
      <TaskBoard taskIds={taskIds} />
    </VStack>
  );
}

export default TaskBoardPage;
