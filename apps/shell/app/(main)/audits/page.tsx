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

    // Wait for iframe to load, then send Auth0 token
    const iframe = document.getElementById('audits-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      // Post message to iframe with Auth0 user info
      iframe.contentWindow.postMessage(
        {
          type: 'AUTH0_TOKEN',
          user: {
            sub: user.sub,
            email: user.email,
            name: user.name,
            // Add other user properties as needed
          },
        },
        auditsAppBaseUrl
      );
    }
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
