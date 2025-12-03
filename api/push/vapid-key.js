// Vercel Serverless Function - Get VAPID public key

const VAPID_PUBLIC_KEY = 'BBttaoWwmIuLMnBgJ72ce2iKQsuyBLkRlzZ4uSvpOvIXmCt53mtFWXdebjgGvaGqzvJVnq-EnjHGxOhvJKDv_nE';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.json({ publicKey: VAPID_PUBLIC_KEY });
};

