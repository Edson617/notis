// Vercel Serverless Function - Subscribe to push notifications
const { connectToDatabase } = require('../lib/mongodb');

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

        const { db } = await connectToDatabase();
        const collection = db.collection('subscriptions');

        const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            userData: {
                userName: userData?.userName || 'Usuario',
                preferences: userData?.preferences || [],
                subscribedAt: userData?.subscribedAt || new Date().toISOString(),
                userAgent: userData?.userAgent || '',
                language: userData?.language || 'es'
            },
            createdAt: new Date()
        };

        // Upsert - actualizar si existe o crear si no
        await collection.updateOne(
            { endpoint: subscription.endpoint },
            { $set: subscriptionData },
            { upsert: true }
        );

        console.log(`[Subscribe] New: ${userData?.userName || 'Unknown'}`);

        res.status(201).json({ 
            success: true, 
            message: 'Subscription saved successfully' 
        });
    } catch (error) {
        console.error('[Subscribe] Error:', error);
        res.status(500).json({ error: 'Failed to save subscription: ' + error.message });
    }
};
