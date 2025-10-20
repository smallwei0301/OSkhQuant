import { Box, Heading, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react';
import useSWR from 'swr';

import { fetchStrategies } from '../lib/api';

type Strategy = {
  id: number;
  name: string;
  description?: string;
  parameters: Record<string, number>;
};

function StrategyCard({ strategy }: { strategy: Strategy }) {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="white" shadow="sm">
      <Heading size="md">{strategy.name}</Heading>
      <Text mt={2} fontSize="sm" color="gray.600">
        {strategy.description || '尚未設定描述'}
      </Text>
      <Stack mt={4} spacing={1} fontSize="sm">
        {Object.keys(strategy.parameters).length === 0 ? (
          <Text color="gray.500">此策略尚未設定參數。</Text>
        ) : (
          Object.entries(strategy.parameters).map(([key, value]) => (
            <Text key={key}>
              {key}：{value}
            </Text>
          ))
        )}
      </Stack>
    </Box>
  );
}

function StrategyList() {
  const { data, error } = useSWR<Strategy[]>(['strategies'], () => fetchStrategies());

  if (error) {
    return (
      <Box bg="red.50" borderRadius="md" p={4} color="red.700">
        無法載入策略資料：{error.message}
      </Box>
    );
  }

  if (!data) {
    return (
      <Stack align="center" py={10} spacing={4} color="gray.600">
        <Spinner size="lg" />
        <Text>策略資料載入中…請確認後端 API 是否啟動。</Text>
      </Stack>
    );
  }

  if (data.length === 0) {
    return (
      <Box bg="yellow.50" borderRadius="md" p={4} color="yellow.800">
        目前尚未建立策略，請透過後端 API 建立後重新整理頁面。
      </Box>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      {data.map((strategy) => (
        <StrategyCard key={strategy.id} strategy={strategy} />
      ))}
    </SimpleGrid>
  );
}

export default StrategyList;
