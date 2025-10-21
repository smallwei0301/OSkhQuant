import { config } from 'dotenv';
import { join } from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
config({ path: join(process.cwd(), envFile), override: true });

const nextConfig = {
  experimental: {
    appDir: true,
    externalDir: true
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV
  }
};

export default nextConfig;
