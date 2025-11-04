// frontend/app/layout.tsx

'use client'; // הופכים לרכיב צד-לקוח כדי להשתמש ב-Hooks

import './globals.css';
import { useEffect } from 'react';
import RtlThemeProvider from '../theme/theme';
import { CssBaseline } from '@mui/material';
import { SnackbarProvider } from '../context/SnackbarContext';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import useAuthStore from '@/store/authStore'; // מייבאים את ה-Store שלנו
import { NotificationsProvider } from '@/context/NotificationsProvider'; // --- 1. הוספנו את ה-import ---
import IframeAuthProvider from '@/components/IframeAuthProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // קוראים לפונקציה שתביא את פרטי המשתמש מה-Store
  const fetchUser = useAuthStore((state) => state.fetchUser);

  // useEffect זה יפעל פעם אחת בלבד כשהאפליקציה נטענת
  useEffect(() => {
    // אנו מפעילים את בדיקת המשתמש כאן, באופן מרכזי
    // כדי שהמידע יהיה זמין לכל שאר הרכיבים באפליקציה
    fetchUser();
  }, [fetchUser]);

  return (
    <html lang="he" dir="rtl">
      <head>
        <title>Audits App</title>
        <meta name="description" content="אפליקציה לביצוע בקרות במסעדות ועסקי מזון" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#1E293B" />
      </head>
      <body>
        <UserProvider>
          <RtlThemeProvider>
            <SnackbarProvider>
              {/* --- 2. עטפנו את הילדים ב-Provider החדש --- */}
              <NotificationsProvider>
                <IframeAuthProvider />
                <CssBaseline />
                {children}
              </NotificationsProvider>
              {/* ------------------------------------------- */}
            </SnackbarProvider>
          </RtlThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}