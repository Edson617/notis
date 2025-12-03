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
        console.log('[Subscriptions] Connecting to database...');
        const { db } = await connectToDatabase();
        const collection = db.collection('subscriptions');

        console.log('[Subscriptions] Fetching subscriptions...');
        // Obtener todas las suscripciones
        const allSubscriptions = await collection.find({}).toArray();
        
        console.log('[Subscriptions] Found:', allSubscriptions.length);

        // Mapear con validación para evitar errores
        const subscriptions = allSubscriptions
            .filter(sub => sub && sub.endpoint) // Filtrar documentos válidos
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
        console.error('[Subscriptions] Error:', error);
        res.status(500).json({ 
            error: 'Failed to get subscriptions', 
            message: error.message,
            total: 0,
            subscriptions: []
        });
    }
};
