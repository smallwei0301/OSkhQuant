import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useMemo } from 'react';

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  console.warn('VITE_API_BASE_URL 未設定，API 請求可能無法運作');
}

export function useApi() {
  const { getAccessTokenSilently } = useAuth0();

  const instance = useMemo(() => {
    const client = axios.create({
      baseURL,
      timeout: 15000
    });

    client.interceptors.request.use(async (config) => {
      const token = await getAccessTokenSilently();
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`
      };
      return config;
    });

    return client;
  }, [getAccessTokenSilently]);

  return instance;
}
