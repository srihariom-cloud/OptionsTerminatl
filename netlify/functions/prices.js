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
    .slice(0, 40);

  if (!tickers.length) {
    return {
      statusCode: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No tickers provided" }),
    };
  }

  const results = {};

  await Promise.allSettled(tickers.map(sym => new Promise((resolve) => {
    https.get({
      hostname: "query1.finance.yahoo.com",
      path: `/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=10d`,
      headers: { "User-Agent": "Mozilla/5.0" },
    }, (res) => {
      let data = "";
      res.on("data", c => (data += c));
      res.on("end", () => {
        try {
          const d = JSON.parse(data);
          const q = d?.chart?.result?.[0];
          if (!q) return resolve();
          const closes  = q.indicators?.quote?.[0]?.close  || [];
          const volumes = q.indicators?.quote?.[0]?.volume || [];
          const meta    = q.meta || {};
          const last    = closes[closes.length - 1];
          const prev5   = closes[closes.length - 6] || closes[0];
          const chg5d   = (last && prev5) ? +((( last - prev5) / prev5) * 100).toFixed(2) : null;
          const avgVol  = volumes.length ? Math.round(volumes.reduce((a,b)=>a+(b||0),0)/volumes.length) : null;
          const lastVol = volumes[volumes.length - 1];
          const volRatio = (avgVol && lastVol) ? +(lastVol / avgVol).toFixed(2) : null;
          const recentC = closes.slice(-6).filter(Boolean);
          const atr5 = recentC.length > 1
            ? recentC.slice(1).reduce((s,c,i) => s + Math.abs(c - recentC[i]), 0) / (recentC.length - 1)
            : 0;
          const atrPct = last && atr5 ? +((atr5 / last) * 100).toFixed(2) : null;
          results[sym] = {
            sym,
            last:        last ? +last.toFixed(2) : null,
            chg5d, volRatio, avgVol, lastVol, atrPct,
            high52:      meta.fiftyTwoWeekHigh ? +meta.fiftyTwoWeekHigh.toFixed(2) : null,
            low52:       meta.fiftyTwoWeekLow  ? +meta.fiftyTwoWeekLow.toFixed(2)  : null,
            distFrom52h: (last && meta.fiftyTwoWeekHigh)
              ? +(((meta.fiftyTwoWeekHigh - last) / meta.fiftyTwoWeekHigh) * 100).toFixed(2) : null,
            distFrom52l: (last && meta.fiftyTwoWeekLow)
              ? +(((last - meta.fiftyTwoWeekLow) / meta.fiftyTwoWeekLow) * 100).toFixed(2) : null,
          };
        } catch (_) {}
        resolve();
      });
    }).on("error", () => resolve())
      .setTimeout(8000, function() { this.destroy(); resolve(); });
  })));

  return {
    statusCode: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify({ results, fetchedAt: new Date().toISOString() }),
  };
};
