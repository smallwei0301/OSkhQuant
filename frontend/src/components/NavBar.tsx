import { Flex, Spacer, ButtonGroup, Button, Avatar, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { FRONTEND_VERSION } from '../version';

const navItems = [
  { label: '資料下載', path: '/download' },
  { label: '任務看板', path: '/tasks' },
  { label: '策略回測', path: '/backtest' },
  { label: '結果儀表板', path: '/results' }
];

function NavBar() {
  const location = useLocation();
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();

  return (
    <Flex align="center" px={6} py={3} boxShadow="sm" background="white">
      <Text fontWeight="bold" fontSize="lg">Lazybacktest 控制台</Text>
      <Text fontSize="xs" color="gray.500" ml={2}>
        {FRONTEND_VERSION}
      </Text>
      <Spacer />
      <ButtonGroup spacing={2} alignItems="center">
        {navItems.map((item) => (
          <Button
            key={item.path}
            as={Link}
            to={item.path}
            variant={location.pathname === item.path ? 'solid' : 'ghost'}
            colorScheme="teal"
            size="sm"
          >
            {item.label}
          </Button>
        ))}
        {isAuthenticated ? (
          <ButtonGroup spacing={2} alignItems="center">
            <Avatar size="sm" name={user?.name} src={user?.picture} />
            <Button size="sm" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
              登出
            </Button>
          </ButtonGroup>
        ) : (
          <Button size="sm" colorScheme="blue" onClick={() => loginWithRedirect()}>
            登入
          </Button>
        )}
      </ButtonGroup>
    </Flex>
  );
}

export default NavBar;
