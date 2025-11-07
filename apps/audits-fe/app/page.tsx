// frontend/app/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import useAuthStore from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  // אנחנו רק צריכים את המשתמש ואת מצב הטעינה מה-Store
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // כל עוד הבדיקה רצה (isLoading), אנחנו לא עושים כלום
    if (isLoading) {
      return;
    }

    // אם הבדיקה הסתיימה ויש משתמש מחובר
    if (user) {
      const userRole = user.role;
      switch (userRole) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'employee':
        case 'manager':
          // ניתן לשנות את היעד לדשבורד הראשי של המנהל אם יש כזה
          router.push('/manager/checklists/run');
          break;
        case 'inspector':
          router.push('/inspection');
          break;
        default:
          // אם למשתמש יש תפקיד לא מוכר, ננתק אותו
          console.error(`Unknown user role: "${userRole}"`);
          window.location.href = '/api/auth/logout';
          break;
      }
    } else {
      // אם הבדיקה הסתיימה ואין משתמש
      // בודקים אם רצים בתוך iframe
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      
      if (isIframe) {
        console.warn('[HomePage] No user in iframe mode - requesting auth from parent');
        window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
      } else {
        // standalone mode - redirect to login
        router.push('/api/auth/login');
      }
    }
  }, [user, isLoading, router]);

  // בכל זמן שהתהליך רץ, או לפני הניתוב, נציג חיווי טעינה
  // זה מבטיח שהמשתמש לא יראה דף ריק או "יקפוץ" בין עמודים
  return (
    <Box 
      minHeight="100vh" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
    >
      <CircularProgress />
    </Box>
  );
}