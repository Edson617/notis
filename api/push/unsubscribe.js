// Vercel Serverless Function - Unsubscribe from push notifications
const { connectToDatabase } = require('../lib/mongodb');

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

        const { db } = await connectToDatabase();
        const collection = db.collection('subscriptions');

        const result = await collection.deleteOne({ endpoint });

        console.log(`[Unsubscribe] Removed: ${result.deletedCount > 0}`);

        res.json({ success: true, deleted: result.deletedCount > 0 });
    } catch (error) {
        console.error('[Unsubscribe] Error:', error);
        res.status(500).json({ error: 'Failed to remove subscription' });
    }
};
