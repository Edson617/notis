// Vercel Serverless Function - Subscribe to push notifications
const { kv } = require('@vercel/kv');

// VAPID Keys - Las mismas que en tu app
const VAPID_PUBLIC_KEY = 'BBttaoWwmIuLMnBgJ72ce2iKQsuyBLkRlzZ4uSvpOvIXmCt53mtFWXdebjgGvaGqzvJVnq-EnjHGxOhvJKDv_nE';

module.exports = async (req, res) => {
    // CORS headers
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
        const { subscription, userData } = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription' });
        }

        // Crear ID único basado en el endpoint
        const subId = Buffer.from(subscription.endpoint).toString('base64').substring(0, 50);

        const subscriptionData = {
            id: subId,
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

        // Guardar en Vercel KV
        await kv.set(`sub:${subId}`, JSON.stringify(subscriptionData));
        
        // Agregar a la lista de suscriptores
        await kv.sadd('subscribers', subId);

        console.log(`[Subscribe] New: ${userData?.userName || 'Unknown'}`);

        res.status(201).json({ 
            success: true, 
            message: 'Subscription saved successfully' 
        });
    } catch (error) {
        console.error('[Subscribe] Error:', error);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
};

