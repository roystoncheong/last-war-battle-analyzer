// Serverless function to proxy Claude API requests
// API key is stored securely in environment variables

const DAILY_LIMIT = 50; // Max requests per day
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // Max 5 requests per minute per IP

// In-memory storage (resets on cold start - for production use Redis/DB)
const usageStore = {
    daily: { count: 0, date: new Date().toDateString() },
    rateLimit: new Map()
};

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get client IP for rate limiting
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.headers['x-real-ip'] ||
                     'unknown';

    // Check rate limit
    const now = Date.now();
    const rateLimitKey = clientIP;
    const clientRequests = usageStore.rateLimit.get(rateLimitKey) || [];
    const recentRequests = clientRequests.filter(t => now - t < RATE_LIMIT_WINDOW);

    if (recentRequests.length >= RATE_LIMIT_MAX) {
        return res.status(429).json({
            error: 'Rate limit exceeded. Please wait a minute before trying again.',
            retryAfter: Math.ceil((recentRequests[0] + RATE_LIMIT_WINDOW - now) / 1000)
        });
    }

    // Check daily limit
    const today = new Date().toDateString();
    if (usageStore.daily.date !== today) {
        usageStore.daily = { count: 0, date: today };
    }

    if (usageStore.daily.count >= DAILY_LIMIT) {
        return res.status(429).json({
            error: 'Daily limit reached. Please try again tomorrow.',
            dailyLimit: DAILY_LIMIT,
            resetTime: 'midnight UTC'
        });
    }

    // Update rate limit tracking
    recentRequests.push(now);
    usageStore.rateLimit.set(rateLimitKey, recentRequests);

    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { messages, max_tokens = 4096 } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid request: messages required' });
        }

        // Forward request to Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens,
                messages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.error?.message || 'API error'
            });
        }

        // Increment usage counter on success
        usageStore.daily.count++;

        // Return response with usage info
        return res.status(200).json({
            ...data,
            usage_info: {
                requests_today: usageStore.daily.count,
                daily_limit: DAILY_LIMIT,
                remaining: DAILY_LIMIT - usageStore.daily.count
            }
        });

    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
