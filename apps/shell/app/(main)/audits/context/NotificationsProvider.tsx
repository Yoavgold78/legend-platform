// frontend/context/NotificationsProvider.tsx

'use client';

import { useEffect, ReactNode, useCallback } from 'react';
import useAuthStore from '@/store/authStore';
import useNotificationStore from '@/store/notificationStore';
import axios from '@/lib/axios';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);

  const registerForPushNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported by this browser.');
      return;
    }

    try {
      console.log('Starting push notification registration...');

      // Step 1: Register BOTH service workers
      const pushRegistration = await navigator.serviceWorker.register('/push-sw.js', { 
        scope: '/' 
      });
      console.log('Push Service Worker registration successful:', pushRegistration);

      // Also register the main PWA service worker (for caching)
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('Main PWA Service Worker registered successfully');
      } catch (error) {
        console.warn('Main service worker registration failed (this is okay):', error);
      }
      
      // Step 2: Wait for the push service worker to become active
      const swRegistration = await navigator.serviceWorker.ready;
      console.log('Service Worker is active and ready:', swRegistration);

      // Step 3: Check for existing subscription
      let subscription = await swRegistration.pushManager.getSubscription();

      if (subscription === null) {
        console.log('No subscription found, requesting permission...');
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
          console.warn('Permission for notifications was not granted. Current permission:', permission);
          return;
        }

        console.log('Notification permission granted');

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error('VAPID public key is not defined in environment variables.');
          console.error('Make sure NEXT_PUBLIC_VAPID_PUBLIC_KEY is set in .env.local');
          return;
        }

        console.log('Using VAPID public key:', vapidPublicKey.substring(0, 20) + '...');

        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        console.log('New subscription created:', subscription);
      } else {
        console.log('Existing subscription found:', subscription);
      }
      
      // Step 4: Send the subscription to the server
      await axios.post('/notifications/subscribe', { subscription });
      console.log('Subscription sent to the server successfully.');

    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }, []);

  // --- START: *** התיקון המרכזי נמצא כאן *** ---
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      console.log('User is authenticated, initializing notifications...');
      
      const initPushNotifications = () => {
        console.log('Fetching notifications and registering for push...');
        fetchNotifications();
        registerForPushNotifications();
      };
      
      // We wait until the entire page is loaded before trying to register.
      // This is a more robust way to avoid the race condition.
      if (document.readyState === 'complete') {
        initPushNotifications();
      } else {
        window.addEventListener('load', initPushNotifications);
        return () => window.removeEventListener('load', initPushNotifications);
      }
    }
  }, [isAuthenticated, isAuthLoading, fetchNotifications, registerForPushNotifications]);
  // --- END: *** התיקון המרכזי נמצא כאן *** ---

  return <>{children}</>;
}