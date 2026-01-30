// Serverless function to check usage stats
// Returns current usage information

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Note: In serverless, each instance has its own memory
    // For accurate tracking, you'd need a database like Vercel KV or Redis
    // This provides approximate usage info

    const DAILY_LIMIT = 50;

    return res.status(200).json({
        daily_limit: DAILY_LIMIT,
        rate_limit: {
            requests_per_minute: 5,
            window_seconds: 60
        },
        note: 'Usage resets daily at midnight UTC'
    });
}
