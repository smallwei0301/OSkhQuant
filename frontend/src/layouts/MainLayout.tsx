import { ReactNode } from 'react';
import { Layout } from 'antd';
import { Box } from '@chakra-ui/react';
import NavBar from '../components/NavBar';

const { Header, Footer } = Layout;

interface Props {
  children: ReactNode;
}

function MainLayout({ children }: Props) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: 'white', padding: 0 }}>
        <NavBar />
      </Header>
      <Box as={Layout} flex="1" background="gray.50">
        {children}
      </Box>
      <Footer style={{ textAlign: 'center' }}>Lazybacktest © {new Date().getFullYear()}</Footer>
    </Layout>
  );
}

export default MainLayout;
