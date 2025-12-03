// Vercel Serverless Function - Unsubscribe from push notifications
const { kv } = require('@vercel/kv');

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
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint required' });
        }

        const subId = Buffer.from(endpoint).toString('base64').substring(0, 50);

        // Eliminar de Vercel KV
        await kv.del(`sub:${subId}`);
        await kv.srem('subscribers', subId);

        console.log(`[Unsubscribe] Removed: ${subId}`);

        res.json({ success: true, deleted: true });
    } catch (error) {
        console.error('[Unsubscribe] Error:', error);
        res.status(500).json({ error: 'Failed to remove subscription' });
    }
};

