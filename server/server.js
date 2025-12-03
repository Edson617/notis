// ========================================
// NotiApp - Backend Server
// Handles push notifications with personalization
// ========================================

const express = require('express');
const cors = require('cors');
const webPush = require('web-push');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// VAPID KEYS
// Generate your own with: npx web-push generate-vapid-keys
// ========================================
const VAPID_KEYS = {
    publicKey: 'BAyWM8-sjVt1WVJDjswBJLwD3nS19nkWcup1i0V_k0huwfI6FSl1Lou164djqq-hg6YHXGC_H8bhLtCU22-fWww',
    privateKey: 'CJuxcHuQmqcvdVCPJ7BqMuBu2M66MM3LLpmcAo6qUro'
};

// Configure web-push
webPush.setVapidDetails(
    'mailto:tu-email@ejemplo.com',
    VAPID_KEYS.publicKey,
    VAPID_KEYS.privateKey
);

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ========================================
// IN-MEMORY SUBSCRIPTION STORE
// In production, use a database like MongoDB, PostgreSQL, etc.
// ========================================
const subscriptions = new Map();

// Save subscriptions to file for persistence
const SUBSCRIPTIONS_FILE = path.join(__dirname, 'subscriptions.json');

function loadSubscriptions() {
    try {
        if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
            const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
            const subs = JSON.parse(data);
            subs.forEach(sub => subscriptions.set(sub.endpoint, sub));
            console.log(`[Server] Loaded ${subscriptions.size} subscriptions`);
        }
    } catch (error) {
        console.error('[Server] Error loading subscriptions:', error);
    }
}

function saveSubscriptions() {
    try {
        const data = Array.from(subscriptions.values());
        fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('[Server] Error saving subscriptions:', error);
    }
}

// Load existing subscriptions on startup
loadSubscriptions();

// ========================================
// API ROUTES
// ========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        subscriptions: subscriptions.size,
        timestamp: new Date().toISOString()
    });
});

// Get VAPID public key
app.get('/api/push/vapid-key', (req, res) => {
    res.json({ publicKey: VAPID_KEYS.publicKey });
});

// Subscribe to push notifications
app.post('/api/push/subscribe', (req, res) => {
    try {
        const { subscription, userData } = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription' });
        }

        // Store subscription with user data for personalization
        const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            userData: {
                userName: userData?.userName || 'Usuario',
                preferences: userData?.preferences || [],
                subscribedAt: userData?.subscribedAt || new Date().toISOString(),
                userAgent: userData?.userAgent || '',
                language: userData?.language || 'es'
            }
        };

        subscriptions.set(subscription.endpoint, subscriptionData);
        saveSubscriptions();

        console.log(`[Server] New subscription from: ${userData?.userName || 'Unknown'}`);
        console.log(`[Server] Preferences: ${userData?.preferences?.join(', ') || 'none'}`);
        console.log(`[Server] Total subscriptions: ${subscriptions.size}`);

        res.status(201).json({ 
            success: true, 
            message: 'Subscription saved successfully' 
        });
    } catch (error) {
        console.error('[Server] Subscribe error:', error);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

// Unsubscribe from push notifications
app.post('/api/push/unsubscribe', (req, res) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint required' });
        }

        const deleted = subscriptions.delete(endpoint);
        saveSubscriptions();

        console.log(`[Server] Subscription removed: ${deleted}`);

        res.json({ 
            success: true, 
            deleted 
        });
    } catch (error) {
        console.error('[Server] Unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to remove subscription' });
    }
});

// Send notification to specific subscriber
app.post('/api/push/send', async (req, res) => {
    try {
        const { endpoint, notification } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint required' });
        }

        const subscriptionData = subscriptions.get(endpoint);
        
        if (!subscriptionData) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Personalize notification with user data
        const personalizedNotification = personalizeNotification(notification, subscriptionData.userData);

        const pushSubscription = {
            endpoint: subscriptionData.endpoint,
            keys: subscriptionData.keys
        };

        await webPush.sendNotification(
            pushSubscription,
            JSON.stringify(personalizedNotification)
        );

        console.log(`[Server] Notification sent to: ${subscriptionData.userData.userName}`);

        res.json({ success: true, message: 'Notification sent' });
    } catch (error) {
        console.error('[Server] Send notification error:', error);

        // Handle expired subscription
        if (error.statusCode === 410) {
            subscriptions.delete(req.body.endpoint);
            saveSubscriptions();
            return res.status(410).json({ error: 'Subscription expired' });
        }

        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// Send notification to all subscribers
app.post('/api/push/broadcast', async (req, res) => {
    try {
        const { notification, filter } = req.body;

        if (!notification) {
            return res.status(400).json({ error: 'Notification content required' });
        }

        const results = {
            sent: 0,
            failed: 0,
            expired: 0
        };

        const expiredEndpoints = [];

        for (const [endpoint, subscriptionData] of subscriptions) {
            // Apply filter based on preferences if specified
            if (filter && filter.preference) {
                if (!subscriptionData.userData.preferences.includes(filter.preference)) {
                    continue;
                }
            }

            try {
                const personalizedNotification = personalizeNotification(notification, subscriptionData.userData);

                const pushSubscription = {
                    endpoint: subscriptionData.endpoint,
                    keys: subscriptionData.keys
                };

                await webPush.sendNotification(
                    pushSubscription,
                    JSON.stringify(personalizedNotification)
                );

                results.sent++;
            } catch (error) {
                if (error.statusCode === 410) {
                    expiredEndpoints.push(endpoint);
                    results.expired++;
                } else {
                    results.failed++;
                }
            }
        }

        // Clean up expired subscriptions
        expiredEndpoints.forEach(endpoint => subscriptions.delete(endpoint));
        if (expiredEndpoints.length > 0) {
            saveSubscriptions();
        }

        console.log(`[Server] Broadcast results:`, results);

        res.json({ 
            success: true, 
            results 
        });
    } catch (error) {
        console.error('[Server] Broadcast error:', error);
        res.status(500).json({ error: 'Broadcast failed' });
    }
});

// Get all subscriptions (admin endpoint)
app.get('/api/push/subscriptions', (req, res) => {
    const subs = Array.from(subscriptions.values()).map(sub => ({
        userName: sub.userData.userName,
        preferences: sub.userData.preferences,
        subscribedAt: sub.userData.subscribedAt,
        endpoint: sub.endpoint,  // Endpoint completo para poder enviar notificaciones
        endpointShort: sub.endpoint.substring(0, 50) + '...'  // Para mostrar en UI
    }));

    res.json({ 
        total: subscriptions.size,
        subscriptions: subs 
    });
});

// ========================================
// PERSONALIZATION FUNCTIONS
// ========================================

function personalizeNotification(notification, userData) {
    const { userName, preferences, language } = userData;

    // Create personalized notification
    const personalized = {
        title: notification.title || 'NotiApp',
        body: notification.body || '',
        icon: notification.icon || '/icons/icon-192.png',
        badge: notification.badge || '/icons/icon-72.png',
        tag: notification.tag || `notiapp-${Date.now()}`,
        data: {
            ...notification.data,
            userName,
            preferences,
            personalizedAt: new Date().toISOString()
        }
    };

    // Add personalized greeting
    if (userName && userName !== 'Usuario') {
        personalized.body = `¡Hola ${userName}! ${personalized.body}`;
    }

    // Add preference-based actions
    if (preferences.includes('ofertas')) {
        personalized.actions = [
            { action: 'ver-oferta', title: '🛒 Ver Oferta' },
            { action: 'close', title: 'Cerrar' }
        ];
    } else {
        personalized.actions = [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Cerrar' }
        ];
    }

    return personalized;
}

// ========================================
// SCHEDULED NOTIFICATIONS (Example)
// ========================================

// Send personalized notifications based on preferences
async function sendScheduledNotifications() {
    const notificationTypes = {
        ofertas: {
            title: '🛒 ¡Oferta Especial!',
            body: 'Tenemos una oferta exclusiva para ti.'
        },
        noticias: {
            title: '📰 Nuevas Noticias',
            body: 'Hay actualizaciones importantes que deberías ver.'
        },
        recordatorios: {
            title: '⏰ Recordatorio',
            body: 'No olvides revisar tus tareas pendientes.'
        },
        alertas: {
            title: '🚨 Alerta Importante',
            body: 'Hay una alerta que requiere tu atención.'
        }
    };

    for (const [preference, notification] of Object.entries(notificationTypes)) {
        // Get subscribers with this preference
        const targetSubscribers = Array.from(subscriptions.values())
            .filter(sub => sub.userData.preferences.includes(preference));

        console.log(`[Scheduler] Sending ${preference} to ${targetSubscribers.length} subscribers`);

        for (const sub of targetSubscribers) {
            try {
                const personalized = personalizeNotification(notification, sub.userData);
                
                await webPush.sendNotification(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    JSON.stringify(personalized)
                );
            } catch (error) {
                console.error(`[Scheduler] Failed to send to ${sub.userData.userName}:`, error.message);
            }
        }
    }
}

// Example: Run scheduled notifications every hour
// setInterval(sendScheduledNotifications, 60 * 60 * 1000);

// ========================================
// SERVE FRONTEND
// ========================================

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
    console.log('========================================');
    console.log(`  NotiApp Server running on port ${PORT}`);
    console.log(`  http://localhost:${PORT}`);
    console.log('========================================');
    console.log(`  VAPID Public Key: ${VAPID_KEYS.publicKey.substring(0, 20)}...`);
    console.log(`  Active subscriptions: ${subscriptions.size}`);
    console.log('========================================');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Server] Shutting down...');
    saveSubscriptions();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[Server] Shutting down...');
    saveSubscriptions();
    process.exit(0);
});

