// Vercel Serverless Function - Get VAPID public key

const VAPID_PUBLIC_KEY = 'BAyWM8-sjVt1WVJDjswBJLwD3nS19nkWcup1i0V_k0huwfI6FSl1Lou164djqq-hg6YHXGC_H8bhLtCU22-fWww';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.json({ publicKey: VAPID_PUBLIC_KEY });
};

