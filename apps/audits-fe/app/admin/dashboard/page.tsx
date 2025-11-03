'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { Typography, Box, CircularProgress } from '@mui/material';

const AdminDashboardPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    // Redirect to reports page when component mounts
    router.replace('/admin/reports');
  }, [router]);

  // Show loading spinner while redirecting
  return (
    <Box sx={{ 
      direction: 'rtl',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh'
    }}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6">
          מעביר לדשבורד הדוחות...
        </Typography>
      </Box>
    </Box>
  );
};

export default AdminDashboardPage;