// ========================================
// NotiApp Service Worker
// Handles caching, offline functionality, and push notifications
// ========================================

const CACHE_NAME = 'notiapp-v1';
const DYNAMIC_CACHE = 'notiapp-dynamic-v1';

// Files to cache for offline use
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/manifest.json',
    '/js/app.js',
    '/js/db.js',
    '/js/push.js',
    '/icons/icon-72.svg',
    '/icons/icon-96.svg',
    '/icons/icon-128.svg',
    '/icons/icon-144.svg',
    '/icons/icon-152.svg',
    '/icons/icon-192.svg',
    '/icons/icon-384.svg',
    '/icons/icon-512.svg'
];

// ========================================
// INSTALL EVENT
// Cache static assets
// ========================================
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Cache failed:', error);
            })
    );
});

// ========================================
// ACTIVATE EVENT
// Clean up old caches
// ========================================
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
                        .map((name) => {
                            console.log('[Service Worker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated successfully');
                return self.clients.claim();
            })
    );
});

// ========================================
// FETCH EVENT
// Network first, fallback to cache strategy
// ========================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests and external requests
    if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
        return;
    }
    
    // API requests - Network first, then cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Static assets - Cache first, then network
    event.respondWith(cacheFirst(request));
});

// Cache first strategy
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            // Return cached response and update cache in background
            updateCache(request);
            return cachedResponse;
        }
        
        // Not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        // Cache the response for future use
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);
        
        // Return offline page if available
        const offlineResponse = await caches.match('/index.html');
        return offlineResponse || new Response('Offline', { status: 503 });
    }
}

// Network first strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[Service Worker] Network request failed, trying cache...');
        
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response(
            JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Update cache in background
async function updateCache(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Silently fail - cache will be updated next time
    }
}

// ========================================
// PUSH EVENT
// Handle push notifications
// ========================================
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received');
    
    let data = {
        title: 'NotiApp',
        body: 'Tienes una nueva notificación',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: 'notiapp-notification',
        data: {}
    };
    
    // Parse push data if available
    if (event.data) {
        try {
            const pushData = event.data.json();
            data = { ...data, ...pushData };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192.png',
        badge: data.badge || '/icons/icon-72.png',
        tag: data.tag || 'notiapp-notification',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Cerrar' }
        ],
        requireInteraction: false,
        renotify: true,
        silent: false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
            .then(() => {
                // Store notification in IndexedDB for history
                return storeNotification(data);
            })
    );
});

// Store notification in IndexedDB
async function storeNotification(data) {
    try {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'NOTIFICATION_RECEIVED',
                payload: {
                    title: data.title,
                    body: data.body,
                    timestamp: Date.now(),
                    data: data.data
                }
            });
        });
    } catch (error) {
        console.error('[Service Worker] Failed to store notification:', error);
    }
}

// ========================================
// NOTIFICATION CLICK EVENT
// ========================================
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    
    event.notification.close();
    
    const action = event.action;
    const notificationData = event.notification.data;
    
    if (action === 'close') {
        return;
    }
    
    // Open app or focus existing window
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.postMessage({
                            type: 'NOTIFICATION_CLICKED',
                            payload: notificationData
                        });
                        return client.focus();
                    }
                }
                
                // Open new window
                if (self.clients.openWindow) {
                    const url = notificationData.url || '/';
                    return self.clients.openWindow(url);
                }
            })
    );
});

// ========================================
// NOTIFICATION CLOSE EVENT
// ========================================
self.addEventListener('notificationclose', (event) => {
    console.log('[Service Worker] Notification closed');
    
    // Analytics or cleanup could go here
});

// ========================================
// SYNC EVENT (Background Sync)
// ========================================
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Sync event:', event.tag);
    
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    try {
        // Sync pending data with server
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                payload: { timestamp: Date.now() }
            });
        });
    } catch (error) {
        console.error('[Service Worker] Sync failed:', error);
    }
}

// ========================================
// MESSAGE EVENT
// Handle messages from main app
// ========================================
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);
    
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_URLS':
            event.waitUntil(
                caches.open(DYNAMIC_CACHE)
                    .then((cache) => cache.addAll(payload.urls))
            );
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(
                caches.keys().then((names) => 
                    Promise.all(names.map((name) => caches.delete(name)))
                )
            );
            break;
            
        default:
            console.log('[Service Worker] Unknown message type:', type);
    }
});

console.log('[Service Worker] Service Worker loaded');

