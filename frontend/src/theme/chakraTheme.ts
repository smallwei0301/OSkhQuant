import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false
};

const theme = extendTheme({
  config,
  fonts: {
    heading: 'Noto Sans TC, system-ui, sans-serif',
    body: 'Noto Sans TC, system-ui, sans-serif'
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50'
      }
    }
  }
});

export default theme;
