import { Grid, GridItem, Heading, Stack, Text } from '@chakra-ui/react';

import BacktestForm from '../components/BacktestForm';
import Layout from '../components/Layout';
import StrategyList from '../components/StrategyList';

function HomePage() {
  return (
    <Layout>
      <Stack spacing={10}>
        <Stack spacing={3}>
          <Heading size="lg">策略總覽</Heading>
          <Text color="gray.600" fontSize="sm">
            透過雲端 API 串接 xtquant，即時掌握策略表現並快速啟動回測。
          </Text>
        </Stack>
        <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr' }} gap={6} alignItems="flex-start">
          <GridItem>
            <StrategyList />
          </GridItem>
          <GridItem>
            <BacktestForm />
          </GridItem>
        </Grid>
      </Stack>
    </Layout>
  );
}

export default HomePage;
