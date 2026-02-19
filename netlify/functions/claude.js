const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-anthropic-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async function (event, context) {
  // Give ourselves max time — Netlify kills at 26s, we stop at 24s
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    event.headers["x-anthropic-key"] ||
    event.headers["X-Anthropic-Key"] || "";

  if (!apiKey) {
    return { statusCode: 401, headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No API key. Set ANTHROPIC_API_KEY in Netlify env vars." }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || "{}"); }
  catch (e) {
    return { statusCode: 400, headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON: " + e.message }) };
  }

  // Cap max_tokens to keep responses within timeout window
  if (payload.max_tokens > 2000) payload.max_tokens = 2000;

  try {
    const result = await callAnthropic(payload, apiKey);
    return {
      statusCode: result.status,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: result.body,
    };
  } catch (e) {
    return { statusCode: 500, headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Proxy error: " + e.message }) };
  }
};

function callAnthropic(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const req = https.request({
      hostname: "api.anthropic.com",
      port: 443,
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    // 23s hard timeout — leaves buffer before Netlify kills us
    req.setTimeout(23000, () => { req.destroy(); reject(new Error("Anthropic timed out — try fewer plays or a smaller universe")); });
    req.write(bodyStr);
    req.end();
  });
}
