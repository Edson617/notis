// Vercel Serverless Function - Send push notification to specific user
const webPush = require('web-push');
const { kv } = require('@vercel/kv');

// VAPID Keys
const VAPID_KEYS = {
    publicKey: 'BBttaoWwmIuLMnBgJ72ce2iKQsuyBLkRlzZ4uSvpOvIXmCt53mtFWXdebjgGvaGqzvJVnq-EnjHGxOhvJKDv_nE',
    privateKey: 'uy4duvTPAaGw9qvd1Xkw8lY52MK2mbYnrkLU3kZXoQw'
};

webPush.setVapidDetails(
    'mailto:notiapp@example.com',
    VAPID_KEYS.publicKey,
    VAPID_KEYS.privateKey
);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { endpoint, notification } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint required' });
        }

        // Buscar suscripción
        const subId = Buffer.from(endpoint).toString('base64').substring(0, 50);
        const subData = await kv.get(`sub:${subId}`);

        if (!subData) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        const subscription = typeof subData === 'string' ? JSON.parse(subData) : subData;

        // Personalizar notificación
        const personalizedNotification = {
            title: notification.title || 'NotiApp',
            body: notification.body || '',
            icon: '/icons/icon-192.svg',
            badge: '/icons/icon-72.svg',
            tag: notification.tag || `notiapp-${Date.now()}`,
            data: {
                ...notification.data,
                userName: subscription.userData.userName,
                timestamp: Date.now()
            }
        };

        // Agregar saludo personalizado
        if (subscription.userData.userName && subscription.userData.userName !== 'Usuario') {
            if (!personalizedNotification.body.includes(subscription.userData.userName)) {
                personalizedNotification.body = `${personalizedNotification.body}`;
            }
        }

        // Enviar notificación
        const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: subscription.keys
        };

        await webPush.sendNotification(
            pushSubscription,
            JSON.stringify(personalizedNotification)
        );

        console.log(`[Send] Sent to: ${subscription.userData.userName}`);

        res.json({ success: true, message: 'Notification sent' });
    } catch (error) {
        console.error('[Send] Error:', error);

        if (error.statusCode === 410) {
            // Suscripción expirada, eliminar
            const subId = Buffer.from(req.body.endpoint).toString('base64').substring(0, 50);
            await kv.del(`sub:${subId}`);
            await kv.srem('subscribers', subId);
            return res.status(410).json({ error: 'Subscription expired' });
        }

        res.status(500).json({ error: 'Failed to send notification' });
    }
};

