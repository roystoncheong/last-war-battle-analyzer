// Netlify Function to proxy Claude API requests
// API key is stored securely in environment variables

const DAILY_LIMIT = 50; // Max requests per day
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // Max 5 requests per minute per IP

// Note: In-memory storage resets on cold start
// For production, use Netlify Blobs or external database
const usageStore = {
    daily: { count: 0, date: new Date().toDateString() },
    rateLimit: new Map()
};

exports.handler = async function(event, context) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get client IP for rate limiting
    const clientIP = event.headers['x-forwarded-for']?.split(',')[0] ||
                     event.headers['x-nf-client-connection-ip'] ||
                     'unknown';

    // Check rate limit
    const now = Date.now();
    const rateLimitKey = clientIP;
    const clientRequests = usageStore.rateLimit.get(rateLimitKey) || [];
    const recentRequests = clientRequests.filter(t => now - t < RATE_LIMIT_WINDOW);

    if (recentRequests.length >= RATE_LIMIT_MAX) {
        return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
                error: 'Rate limit exceeded. Please wait a minute before trying again.',
                retryAfter: Math.ceil((recentRequests[0] + RATE_LIMIT_WINDOW - now) / 1000)
            })
        };
    }

    // Check daily limit
    const today = new Date().toDateString();
    if (usageStore.daily.date !== today) {
        usageStore.daily = { count: 0, date: today };
    }

    if (usageStore.daily.count >= DAILY_LIMIT) {
        return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
                error: 'Daily limit reached. Please try again tomorrow.',
                dailyLimit: DAILY_LIMIT,
                resetTime: 'midnight UTC'
            })
        };
    }

    // Update rate limit tracking
    recentRequests.push(now);
    usageStore.rateLimit.set(rateLimitKey, recentRequests);

    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'API key not configured' })
        };
    }

    try {
        const requestBody = JSON.parse(event.body);
        const { messages, max_tokens = 4096 } = requestBody;

        if (!messages || !Array.isArray(messages)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid request: messages required' })
            };
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
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: data.error?.message || 'API error'
                })
            };
        }

        // Increment usage counter on success
        usageStore.daily.count++;

        // Return response with usage info
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ...data,
                usage_info: {
                    requests_today: usageStore.daily.count,
                    daily_limit: DAILY_LIMIT,
                    remaining: DAILY_LIMIT - usageStore.daily.count
                }
            })
        };

    } catch (error) {
        console.error('API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
