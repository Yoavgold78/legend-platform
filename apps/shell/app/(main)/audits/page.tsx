'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Audits Page - Iframe Integration
 * 
 * Embeds the AuditsApp frontend (deployed separately) via iframe.
 * Passes Auth0 token to iframe via postMessage for seamless authentication.
 */
export default function AuditsPage() {
  const { user, isLoading } = useUser();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  
  // Audits frontend URL (set via environment variable)
  const auditsAppBaseUrl = process.env.NEXT_PUBLIC_AUDITS_FE_URL || 'http://localhost:3001';
  
  // Determine the specific route based on user role
  // Default to admin dashboard for now
  const auditsAppUrl = `${auditsAppBaseUrl}/admin/dashboard`;

  useEffect(() => {
    if (!user || !iframeLoaded) return;

    const iframe = document.getElementById('audits-iframe') as HTMLIFrameElement;
    if (!iframe || !iframe.contentWindow) return;

    // Helper function to send token to iframe
    const sendTokenToIframe = async () => {
      try {
        console.log('[Shell] Fetching access token for iframe...');
        const tokenResponse = await fetch('/api/auth/token');
        
        if (!tokenResponse.ok) {
          console.error('[Shell] Failed to get access token:', tokenResponse.status);
          return;
        }
        
        const { accessToken } = await tokenResponse.json();
        console.log('[Shell] Sending access token to iframe (length:', accessToken?.length || 0, ')');
        
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: 'AUTH0_TOKEN',
              token: accessToken,
            },
            auditsAppBaseUrl
          );
        }
      } catch (error) {
        console.error('[Shell] Error sending token to iframe:', error);
      }
    };

    // Send token immediately on load
    sendTokenToIframe();

    // Listen for token requests from iframe
    const handleMessage = async (event: MessageEvent) => {
      // Verify it's from audits-fe
      if (event.origin !== auditsAppBaseUrl) return;

      console.log('[Shell] Received message from iframe:', event.data?.type);

      if (event.data?.type === 'REQUEST_TOKEN' || event.data?.type === 'REQUEST_AUTH') {
        console.log('[Shell] iframe requested token, sending...');
        await sendTokenToIframe();
      }

      if (event.data?.type === 'LOGOUT') {
        console.log('[Shell] iframe requested logout');
        window.location.href = '/api/auth/logout';
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user, iframeLoaded, auditsAppBaseUrl]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>Please log in to access Audits</Typography>
      </Box>
    );
  }

  // If audits-fe URL is not configured, show placeholder
  if (!process.env.NEXT_PUBLIC_AUDITS_FE_URL) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="80vh" gap={2}>
        <Typography variant="h4">🚧 Audits App</Typography>
        <Typography variant="body1" color="text.secondary">
          The Audits application is being deployed. Please check back soon.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          (Environment variable NEXT_PUBLIC_AUDITS_FE_URL not configured)
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 64px)', position: 'relative' }}>
      {!iframeLoaded && (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={1}
        >
          <CircularProgress />
        </Box>
      )}
      <iframe
        id="audits-iframe"
        src={auditsAppUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: iframeLoaded ? 'block' : 'none',
        }}
        title="Audits Application"
        onLoad={() => setIframeLoaded(true)}
      />
    </Box>
  );
}
