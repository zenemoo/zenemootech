// ZENEMOO Service Worker for Web Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Zenemoo Update';
    const options = {
      body: data.message || data.body || 'You have a new message from Zenemoo.',
      icon: '/favicon.png',
      badge: '/favicon.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        id: data.id,
      },
      actions: [
        {
          action: 'open',
          title: 'View Details',
        },
        {
          action: 'close',
          title: 'Dismiss',
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Service worker push error:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
