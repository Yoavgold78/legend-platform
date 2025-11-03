// frontend/app/inspection/layout.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { Box, CircularProgress, Container, Typography } from '@mui/material';

export default function InspectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, fetchUser } = useAuthStore();

  // useEffect ראשון: אחראי להפעיל את בדיקת המשתמש כשהרכיב נטען לראשונה
  useEffect(() => {
    // אם אין משתמש בזיכרון, נפעיל את הפונקציה שתביא אותו
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  // useEffect שני: אחראי להגיב לשינויים במצב האימות
  useEffect(() => {
    // אם התהליך עדיין בטעינה, נחכה
    if (isLoading) {
      return;
    }

    // אם הטעינה הסתיימה ואין משתמש, או שהתפקיד שלו אינו מתאים, נעביר להתחברות
    const isAuthorized = user && (user.role === 'inspector' || user.role === 'admin');
    if (!isAuthorized) {
      router.push('/api/auth/login');
    }
  }, [user, isLoading, router]);

  // כל עוד הטעינה מתבצעת, נציג חיווי מתאים
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          textAlign: 'center',
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>מאמת פרטי בקר...</Typography>
      </Box>
    );
  }

  // רק אם הטעינה הסתיימה והמשתמש מורשה, נציג את תוכן העמוד
  const isAuthorized = user && (user.role === 'inspector' || user.role === 'admin');
  if (isAuthorized) {
    return (
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
            {children}
        </Container>
    );
  }

  // במקרה קצה (למשל, לפני הניתוב), נציג מסך טעינה
  return (
     <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
  );
}