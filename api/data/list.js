// API para obtener todos los datos de MongoDB
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

    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
        return res.status(500).json({ error: 'Database not configured', items: [] });
    }

    let client;

    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        const db = client.db('noti');
        const collection = db.collection('user_data');

        const items = await collection.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        res.json({ 
            success: true, 
            total: items.length,
            items: items.map(item => ({
                oderId: item.oderId,
                text: item.text,
                createdAt: item.createdAt,
                source: item.source
            }))
        });
    } catch (error) {
        console.error('[List] Error:', error);
        res.status(500).json({ error: 'List failed', message: error.message, items: [] });
    } finally {
        if (client) await client.close();
    }
};

