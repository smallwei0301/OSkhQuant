import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false
};

const theme = extendTheme({
  config,
  fonts: {
    heading: 'Noto Sans TC, sans-serif',
    body: 'Noto Sans TC, sans-serif'
  }
});

export default theme;
