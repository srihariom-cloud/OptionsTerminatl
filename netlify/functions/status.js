// Returns whether ANTHROPIC_API_KEY is set in Netlify env vars
// Browser uses this to skip the "paste your key" prompt
exports.handler = async function () {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      hasServerKey: !!process.env.ANTHROPIC_API_KEY,
    }),
  };
};
