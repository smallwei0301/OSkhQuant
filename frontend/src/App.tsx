import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin, Layout } from 'antd';
import { useAuth0 } from '@auth0/auth0-react';
import routes from './routes';
import MainLayout from './layouts/MainLayout';
import AuthGuard from './components/AuthGuard';

const { Content } = Layout;

function App() {
  const { isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <MainLayout>
      <Content style={{ padding: '24px' }}>
        <Suspense fallback={<Spin />}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.protected ? <AuthGuard>{route.element}</AuthGuard> : route.element}
              />
            ))}
            <Route path="*" element={<Navigate to="/download" replace />} />
          </Routes>
        </Suspense>
      </Content>
    </MainLayout>
  );
}

export default App;
