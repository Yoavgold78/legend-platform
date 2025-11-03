'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Box, Typography, Paper, CircularProgress } from '@mui/material';
import Image from 'next/image';
// --- THIS IS THE FIX for version 3.5.0 ---
import { useUser } from '@auth0/nextjs-auth0/client';

export default function LoginPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If the hook has loaded and found a user, it means we're already logged in.
    // Redirect to the main page, which will then route based on role.
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // While the hook is checking for an existing session, show a loading spinner.
  if (isLoading) {
    return (
      <Box 
        minHeight="100vh" 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        bgcolor="#F8FAFC"
      >
        <CircularProgress />
      </Box>
    );
  }

  // If there's no user and it's not loading, show the login button.
  return (
    <Box position="relative" minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#F8FAFC" px={2}>
      <Box position="absolute" top={12} right={12}>
        <Image src="/Logo.jpg" alt="LEGENDA" width={100} height={40} style={{ objectFit: 'contain' }} />
      </Box>

      <Paper elevation={3} sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Box textAlign="center" mb={2}>
          <Typography variant="h5" fontWeight={700} mb={1}>ברוכים הבאים</Typography>
          <Typography variant="body2" color="text.secondary">אנא התחברו כדי להמשיך</Typography>
        </Box>
        
        <Box sx={{ mt: 4 }}>
          <Button 
            component="a" // This makes the button act like a link
            href="/api/auth/login" // This is the magic link that starts the Auth0 login process
            variant="contained" 
            color="primary" 
            fullWidth 
            sx={{ height: 44, fontWeight: 600 }}
          >
            התחבר
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}