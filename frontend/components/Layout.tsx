import { Box, Container, Flex, Heading, Text } from '@chakra-ui/react';
import Head from 'next/head';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <>
      <Head>
        <title>Lazybacktest 行動交易中心</title>
        <meta name="description" content="Lazybacktest 行動回測與策略管理平台" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Flex minH="100vh" direction="column" bg="gray.50">
        <Box bgGradient="linear(to-r, teal.500, green.400)" py={6} px={4} color="white">
          <Container maxW="6xl">
            <Heading size="lg">Lazybacktest 行動交易中心</Heading>
            <Text mt={2} fontSize="md">
              透過雲端回測與策略管理，為日流量 1 萬人次的交易者打造即時決策體驗。
            </Text>
          </Container>
        </Box>
        <Container maxW="6xl" flex="1" py={10} px={4}>
          {children}
        </Container>
        <Box as="footer" py={4} textAlign="center" fontSize="sm" color="gray.600">
          版本代碼：LB-ARCH-0001
        </Box>
      </Flex>
    </>
  );
}

export default Layout;
