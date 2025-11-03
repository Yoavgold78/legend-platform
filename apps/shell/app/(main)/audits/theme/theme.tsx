'use client'; // Required for Next.js App Router

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';

// Create a cache for RTL
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [rtlPlugin],
  prepend: true, // ensure RTL styles are inserted before other styles
});

// Create a theme instance with RTL direction
const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: 'Heebo, Roboto, Arial, sans-serif',
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          // use logical alignment so `start` maps to right in RTL
          textAlign: 'start',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          // use logical alignment so inputs follow document direction
          textAlign: 'start',
          direction: 'rtl',
        },
      },
    },
  },
});

export default function RtlThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        {/* ensure the rendered DOM has RTL direction so native layout aligns right */}
        <div dir="rtl">
          {children}
        </div>
      </ThemeProvider>
    </CacheProvider>
  );
}