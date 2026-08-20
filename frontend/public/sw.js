// ZENEMOO Service Worker for Web Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = { message: event.data.text() };
    }

    const title = data.title || 'Zenemoo Update';
    let rawUrl = data.url || '/';
    if (rawUrl.startsWith('/')) {
      rawUrl = 'https://www.zenemoo.in' + rawUrl;
    }

    const options = {
      body: data.message || data.body || 'You have a new message from Zenemoo.',
      icon: '/assets/logo.png',
      badge: '/assets/logo.png',
      vibrate: [100, 50, 100],
      data: {
        url: rawUrl,
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

  let targetUrl = event.notification.data?.url || 'https://www.zenemoo.in/';
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

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
