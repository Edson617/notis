// MongoDB Connection Helper
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('noti');
    
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
}

module.exports = { connectToDatabase };

