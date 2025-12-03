// API para sincronizar datos offline con MongoDB
const { MongoClient } = require('mongodb');

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

    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
        return res.status(500).json({ error: 'Database not configured' });
    }

    let client;

    try {
        const { items, oderId } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Items array required' });
        }

        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        const db = client.db('noti');
        const collection = db.collection('user_data');

        // Insertar todos los items pendientes
        const results = [];
        
        for (const item of items) {
            const doc = {
                oderId: item.oderId,
                text: item.text,
                createdAt: new Date(item.timestamp),
                syncedAt: new Date(),
                source: 'offline_sync'
            };
            
            // Evitar duplicados usando oderId
            const existing = await collection.findOne({ oderId: item.oderId });
            
            if (!existing) {
                await collection.insertOne(doc);
                results.push({ oderId: item.oderId, status: 'synced' });
            } else {
                results.push({ oderId: item.oderId, status: 'already_exists' });
            }
        }

        res.json({ 
            success: true, 
            synced: results.filter(r => r.status === 'synced').length,
            results 
        });
    } catch (error) {
        console.error('[Sync] Error:', error);
        res.status(500).json({ error: 'Sync failed', message: error.message });
    } finally {
        if (client) await client.close();
    }
};

