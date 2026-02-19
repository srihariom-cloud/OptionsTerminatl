const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const tickers = (event.queryStringParameters?.tickers || "")
    .split(",")
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 25);

  if (!tickers.length) {
    return { statusCode: 400, headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No tickers provided" }) };
  }

  const results = {};

  // Fetch in small batches to avoid overwhelming Yahoo Finance
  const BATCH = 5;
  for (let i = 0; i < tickers.length; i += BATCH) {
    const batch = tickers.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(sym => fetchTicker(sym, results)));
  }

  return {
    statusCode: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify({ results, fetchedAt: new Date().toISOString() }),
  };
};

function fetchTicker(sym, results) {
  return new Promise((resolve) => {
    // Try two Yahoo Finance endpoints
    const endpoints = [
      { host: "query1.finance.yahoo.com", path: `/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=10d` },
      { host: "query2.finance.yahoo.com", path: `/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=10d` },
    ];

    let tried = 0;
    function tryNext() {
      if (tried >= endpoints.length) return resolve();
      const ep = endpoints[tried++];
      const req = https.get({
        hostname: ep.host,
        path: ep.path,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }, (res) => {
        if (res.statusCode !== 200) {
          // drain and try next endpoint
          res.resume();
          return tryNext();
        }
        let data = "";
        res.on("data", c => (data += c));
        res.on("end", () => {
          try {
            const d = JSON.parse(data);
            const q = d?.chart?.result?.[0];
            if (!q) return tryNext();
            const closes  = q.indicators?.quote?.[0]?.close  || [];
            const volumes = q.indicators?.quote?.[0]?.volume || [];
            const meta    = q.meta || {};
            const last    = closes.filter(Boolean).at(-1);
            const prev5   = closes.filter(Boolean).at(-6) || closes.filter(Boolean)[0];
            const chg5d   = (last && prev5) ? +((( last - prev5) / prev5) * 100).toFixed(2) : null;
            const vols    = volumes.filter(Boolean);
            const avgVol  = vols.length ? Math.round(vols.reduce((a,b)=>a+b,0)/vols.length) : null;
            const lastVol = vols.at(-1);
            const volRatio = (avgVol && lastVol) ? +(lastVol / avgVol).toFixed(2) : null;
            const recentC = closes.filter(Boolean).slice(-6);
            const atr5 = recentC.length > 1
              ? recentC.slice(1).reduce((s,c,i) => s + Math.abs(c - recentC[i]), 0) / (recentC.length - 1)
              : 0;
            results[sym] = {
              sym,
              last:        last  ? +last.toFixed(2) : null,
              chg5d, volRatio, avgVol, lastVol,
              atrPct:      last && atr5 ? +((atr5 / last) * 100).toFixed(2) : null,
              high52:      meta.fiftyTwoWeekHigh ? +meta.fiftyTwoWeekHigh.toFixed(2) : null,
              low52:       meta.fiftyTwoWeekLow  ? +meta.fiftyTwoWeekLow.toFixed(2)  : null,
              distFrom52h: (last && meta.fiftyTwoWeekHigh)
                ? +(((meta.fiftyTwoWeekHigh - last) / meta.fiftyTwoWeekHigh) * 100).toFixed(2) : null,
              distFrom52l: (last && meta.fiftyTwoWeekLow)
                ? +(((last - meta.fiftyTwoWeekLow) / meta.fiftyTwoWeekLow) * 100).toFixed(2) : null,
            };
          } catch (_) { tryNext(); }
          resolve();
        });
      });
      req.on("error", () => tryNext());
      req.setTimeout(7000, () => { req.destroy(); tryNext(); });
    }
    tryNext();
  });
}
