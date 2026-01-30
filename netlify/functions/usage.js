// Netlify Function to get usage statistics

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Note: This returns approximate values since serverless functions
    // don't share state. For accurate tracking, use a database.
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            daily_limit: 50,
            message: 'Usage tracking is approximate. Actual usage shown after each analysis.'
        })
    };
};
