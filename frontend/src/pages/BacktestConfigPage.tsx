import { Heading, Text, VStack } from '@chakra-ui/react';
import BacktestConfigForm from '../components/BacktestConfigForm';

function BacktestConfigPage() {
  return (
    <VStack align="stretch" spacing={6}>
      <Heading size="lg">策略回測配置</Heading>
      <Text color="gray.600">設定 RSI 指標與資金參數，上傳策略檔後即可啟動回測任務。</Text>
      <BacktestConfigForm />
    </VStack>
  );
}

export default BacktestConfigPage;
