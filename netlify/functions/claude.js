// netlify/functions/claude.js
// Proxies requests to api.anthropic.com — avoids browser CORS restrictions.
// The ANTHROPIC_API_KEY env var is set in Netlify dashboard (never exposed to browser).
// Users can also supply their own key via x-anthropic-key header as fallback.

const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-anthropic-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Key priority: env var (set in Netlify dashboard) > header sent by browser
  const apiKey = process.env.ANTHROPIC_API_KEY || event.headers['x-anthropic-key'] || '';
  if (!apiKey) {
    return {
      statusCode: 401, headers,
      body: JSON.stringify({ error: 'No API key. Set ANTHROPIC_API_KEY in Netlify env vars, or paste your key in the app Settings.' })
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  // Forward to Anthropic
  const result = await new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Anthropic timeout')); });
    req.write(payload);
    req.end();
  });

  return {
    statusCode: result.status,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: result.body,
  };
};
