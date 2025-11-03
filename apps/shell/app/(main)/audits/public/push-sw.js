// frontend/public/push-sw.js
// Custom service worker for push notifications

console.log('Push Service Worker loaded');

self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.message || data.body || 'ביקורת חדשה נוצרה',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.type || 'notification',
      data: {
        url: data.url || '/manager/audits',
        ...data
      },
      actions: [
        {
          action: 'view',
          title: 'צפה',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'close',
          title: 'סגור'
        }
      ],
      requireInteraction: true,
      silent: false,
      dir: 'rtl', // Right-to-left for Hebrew
      lang: 'he'
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'התראה חדשה', options)
    );
  } catch (error) {
    console.error('Error processing push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('התראה חדשה', {
        body: 'ביקורת חדשה נוצרה במערכת',
        icon: '/icons/icon-192x192.png',
        tag: 'fallback-notification',
        dir: 'rtl',
        lang: 'he'
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/manager/audits';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        // Try to focus existing window
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(window.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              // Navigate to the notification URL
              return client.navigate(urlToOpen);
            });
          }
        }
        
        // Open new window if no existing window found
        if (clients.openWindow) {
          return clients.openWindow(window.location.origin + urlToOpen);
        }
      })
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});

// Handle service worker activation
self.addEventListener('activate', function(event) {
  console.log('Push Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle service worker installation
self.addEventListener('install', function(event) {
  console.log('Push Service Worker installed');
  self.skipWaiting();
});