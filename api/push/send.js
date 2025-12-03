// Vercel Serverless Function - Send push notification to specific user
const webPush = require('web-push');
const { connectToDatabase } = require('../lib/mongodb');

// VAPID Keys
const VAPID_KEYS = {
    publicKey: 'BAyWM8-sjVt1WVJDjswBJLwD3nS19nkWcup1i0V_k0huwfI6FSl1Lou164djqq-hg6YHXGC_H8bhLtCU22-fWww',
    privateKey: 'CJuxcHuQmqcvdVCPJ7BqMuBu2M66MM3LLpmcAo6qUro'
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

        const { db } = await connectToDatabase();
        const collection = db.collection('subscriptions');

        // Buscar suscripción por endpoint
        const subscription = await collection.findOne({ endpoint });

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

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
            const { db } = await connectToDatabase();
            await db.collection('subscriptions').deleteOne({ endpoint: req.body.endpoint });
            return res.status(410).json({ error: 'Subscription expired' });
        }

        res.status(500).json({ error: 'Failed to send notification: ' + error.message });
    }
};
