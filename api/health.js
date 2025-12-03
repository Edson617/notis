// Vercel Serverless Function - Health check

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.json({ 
        status: 'ok',
        platform: 'vercel',
        timestamp: new Date().toISOString()
    });
};

