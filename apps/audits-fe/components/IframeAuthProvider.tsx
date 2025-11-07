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
      const allowedOrigins = [
        'http://localhost:3000',
        'https://legend-shell-staging.onrender.com'
      ];
      if (!allowedOrigins.includes(event.origin)) {
        return; // silent ignore for noise reduction
      }

      // Direct token delivery (simpler contract): { type: 'AUTH0_TOKEN', token }
      if (event.data?.type === 'AUTH0_TOKEN' && event.data?.token) {
        console.log('✅ Received AUTH0_TOKEN with token');
        setIframeToken(event.data.token);
        return;
      }

      // Two-step legacy handshake: request followed by TOKEN_RESPONSE
      if (event.data?.type === 'AUTH0_TOKEN') {
        console.log('ℹ️ AUTH0_TOKEN handshake trigger – requesting token');
        window.parent?.postMessage({ type: 'REQUEST_TOKEN' }, event.origin);
        return;
      }

      if (event.data?.type === 'TOKEN_RESPONSE' && event.data?.token) {
        console.log('✅ Received TOKEN_RESPONSE with token');
        setIframeToken(event.data.token);
      }
    };

    window.addEventListener('message', handleMessage);

    // Request initial auth on mount
    if (window.parent) {
      console.log('📤 Requesting initial token from parent (REQUEST_AUTH)');
      window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
      // Also proactively request legacy token path
      window.parent.postMessage({ type: 'REQUEST_TOKEN' }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setIframeToken]);

  return null; // This component doesn't render anything
}
