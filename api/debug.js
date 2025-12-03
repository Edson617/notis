// Debug endpoint para verificar configuración
const { MongoClient } = require('mongodb');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const MONGODB_URI = process.env.MONGODB_URI;
    
    const status = {
        hasMongoUri: !!MONGODB_URI,
        mongoUriStart: MONGODB_URI ? MONGODB_URI.substring(0, 30) + '...' : 'NOT SET',
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    };
    
    // Probar conexión si hay URI
    if (MONGODB_URI) {
        let client;
        try {
            client = new MongoClient(MONGODB_URI);
            await client.connect();
            
            const db = client.db('noti');
            const collections = await db.listCollections().toArray();
            
            status.dbConnected = true;
            status.collections = collections.map(c => c.name);
            
            // Contar documentos en subscriptions
            const count = await db.collection('subscriptions').countDocuments();
            status.subscriptionCount = count;
            
        } catch (error) {
            status.dbConnected = false;
            status.dbError = error.message;
        } finally {
            if (client) await client.close();
        }
    }
    
    res.json(status);
};

