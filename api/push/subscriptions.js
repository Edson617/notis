// Vercel Serverless Function - Get all subscriptions (admin)
const { MongoClient } = require('mongodb');

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

    // Verificar variable de entorno
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
        console.error('[Subscriptions] MONGODB_URI not set!');
        return res.status(500).json({ 
            error: 'Database not configured',
            message: 'MONGODB_URI environment variable is missing',
            total: 0,
            subscriptions: []
        });
    }

    let client;
    
    try {
        console.log('[Subscriptions] Connecting to MongoDB...');
        
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        console.log('[Subscriptions] Connected!');
        
        const db = client.db('noti');
        const collection = db.collection('subscriptions');

        const allSubscriptions = await collection.find({}).toArray();
        
        console.log('[Subscriptions] Found:', allSubscriptions.length, 'documents');

        const subscriptions = allSubscriptions
            .filter(sub => sub && sub.endpoint)
            .map(sub => ({
                userName: sub.userData?.userName || sub.userName || 'Usuario',
                preferences: sub.userData?.preferences || sub.preferences || [],
                subscribedAt: sub.userData?.subscribedAt || sub.subscribedAt || sub.createdAt || new Date().toISOString(),
                endpoint: sub.endpoint
            }));

        res.json({ 
            total: subscriptions.length,
            subscriptions 
        });
    } catch (error) {
        console.error('[Subscriptions] Error:', error.message);
        res.status(500).json({ 
            error: 'Database error', 
            message: error.message,
            total: 0,
            subscriptions: []
        });
    } finally {
        if (client) {
            await client.close();
        }
    }
};
