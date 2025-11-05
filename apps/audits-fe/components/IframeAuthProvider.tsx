'use client';

import { useEffect } from 'react';
import useAuthStore from '@/store/authStore';

/**
 * IframeAuthProvider
 * 
 * Listens for authentication messages from parent frame (Shell)
 * and sets the token in the auth store.
 */
export default function IframeAuthProvider() {
  // Narrowly type the selector parameter to avoid implicit any
  interface SelectorState { setIframeToken: (token: string) => void }
  const setIframeToken = useAuthStore((state: SelectorState) => state.setIframeToken);

  useEffect(() => {
    // Check if we're in an iframe
    const isIframe = window.self !== window.top;
    
    if (!isIframe) {
      console.log('📌 Not in iframe, using standalone Auth0 mode');
      return;
    }

    console.log('📌 Running in iframe mode, listening for auth messages');

    const handleMessage = async (event: MessageEvent) => {
      // Verify origin - only accept from Shell
      const allowedOrigins = [
        'http://localhost:3000',
        'https://legend-shell-staging.onrender.com'
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.warn('❌ Rejected message from unauthorized origin:', event.origin);
        return;
      }

      // Handle AUTH0_TOKEN message
      if (event.data?.type === 'AUTH0_TOKEN') {
        console.log('✅ Received AUTH0_TOKEN from parent');
        
        // Request access token from parent
        if (window.parent) {
          window.parent.postMessage({ type: 'REQUEST_TOKEN' }, event.origin);
        }
      }

      // Handle TOKEN_RESPONSE message
      if (event.data?.type === 'TOKEN_RESPONSE' && event.data?.token) {
        console.log('✅ Received access token from parent');
        setIframeToken(event.data.token);
      }
    };

    window.addEventListener('message', handleMessage);

    // Request initial auth on mount
    if (window.parent) {
      console.log('📤 Requesting initial token from parent');
      window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setIframeToken]);

  return null; // This component doesn't render anything
}
