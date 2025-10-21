import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    '../models/schemas/**/*.json'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f6ff',
          100: '#dbe4ff',
          200: '#b5c9ff',
          300: '#8facff',
          400: '#698fff',
          500: '#4374ff',
          600: '#315cdc',
          700: '#2547aa',
          800: '#1a3278',
          900: '#101f46'
        }
      }
    }
  },
  plugins: [forms]
};

export default config;
