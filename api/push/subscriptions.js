// Vercel Serverless Function - Get all subscriptions (admin)
const { connectToDatabase } = require('../lib/mongodb');

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
        const { db } = await connectToDatabase();
        const collection = db.collection('subscriptions');

        // Obtener todas las suscripciones
        const allSubscriptions = await collection.find({}).toArray();

        const subscriptions = allSubscriptions.map(sub => ({
            userName: sub.userData.userName,
            preferences: sub.userData.preferences,
            subscribedAt: sub.userData.subscribedAt,
            endpoint: sub.endpoint
        }));

        res.json({ 
            total: subscriptions.length,
            subscriptions 
        });
    } catch (error) {
        console.error('[Subscriptions] Error:', error);
        res.status(500).json({ error: 'Failed to get subscriptions: ' + error.message });
    }
};
