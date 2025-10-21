import { ReactNode, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Spin } from 'antd';

interface Props {
  children: ReactNode;
}

function AuthGuard({ children }: Props) {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex-center">
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
