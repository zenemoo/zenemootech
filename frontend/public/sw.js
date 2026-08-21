// ZENEMOO Service Worker for Web Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.warn('[SW Push]: Push event received with no data. Skipping notification.');
    return;
  }

  try {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = { message: event.data.text() };
    }

    console.log('[SW Push]: Received push. Type:', data.notification_type, '| ID:', data.id);

    const title = data.title || 'Zenemoo Update';

    // Normalize URL: only attach if a real URL was sent, otherwise null
    let notifUrl = null;
    if (data.url && data.url !== 'null' && data.url !== '/') {
      notifUrl = data.url.startsWith('/') ? 'https://www.zenemoo.in' + data.url : data.url;
    }

    const options = {
      body: data.message || data.body || 'You have a new message from Zenemoo.',
      icon: '/assets/logo.png',
      badge: '/assets/logo.png',
      vibrate: [100, 50, 100],
      data: {
        url: notifUrl || 'https://www.zenemoo.in/',
        id: data.id,
        notification_type: data.notification_type,
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

    console.log('[SW Push]: Showing notification. Title:', title, '| URL:', options.data.url);
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW Push Error]:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'close') return;

  let targetUrl = event.notification.data?.url || 'https://www.zenemoo.in/';

  // Ensure it's a relative path or trusted Zenemoo domain
  if (targetUrl.startsWith('/')) {
    targetUrl = 'https://www.zenemoo.in' + targetUrl;
  }

  // Domain security validation
  try {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'www.zenemoo.in' && host !== 'zenemoo.in') {
      targetUrl = 'https://www.zenemoo.in/';
    }
  } catch (e) {
    targetUrl = 'https://www.zenemoo.in/';
  }

  console.log('[SW NotificationClick]: Opening URL:', targetUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Try to find an existing Zenemoo tab and focus + navigate it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.hostname === 'www.zenemoo.in' || clientUrl.hostname === 'zenemoo.in' || clientUrl.hostname === 'localhost') {
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        } catch (e) {}
      }
      // No existing tab found — open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
