// Vercel Serverless Function - Get all subscriptions (admin)
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Obtener todos los IDs de suscriptores
        const subscriberIds = await kv.smembers('subscribers');
        
        if (!subscriberIds || subscriberIds.length === 0) {
            return res.json({ total: 0, subscriptions: [] });
        }

        // Obtener datos de cada suscriptor
        const subscriptions = [];
        
        for (const subId of subscriberIds) {
            const subData = await kv.get(`sub:${subId}`);
            if (subData) {
                const subscription = typeof subData === 'string' ? JSON.parse(subData) : subData;
                subscriptions.push({
                    userName: subscription.userData.userName,
                    preferences: subscription.userData.preferences,
                    subscribedAt: subscription.userData.subscribedAt,
                    endpoint: subscription.endpoint
                });
            }
        }

        res.json({ 
            total: subscriptions.length,
            subscriptions 
        });
    } catch (error) {
        console.error('[Subscriptions] Error:', error);
        res.status(500).json({ error: 'Failed to get subscriptions' });
    }
};

