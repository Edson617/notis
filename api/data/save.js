// API para guardar un dato directamente en MongoDB
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
        const { oderId, text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        const db = client.db('noti');
        const collection = db.collection('user_data');

        const doc = {
            oderId: oderId || `online_${Date.now()}`,
            text,
            createdAt: new Date(),
            syncedAt: new Date(),
            source: 'online'
        };

        await collection.insertOne(doc);

        res.json({ success: true, id: doc.oderId });
    } catch (error) {
        console.error('[Save] Error:', error);
        res.status(500).json({ error: 'Save failed', message: error.message });
    } finally {
        if (client) await client.close();
    }
};

