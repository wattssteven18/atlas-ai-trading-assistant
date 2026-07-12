let latestSignal = null;

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ signal: latestSignal, note: "Serverless memory is temporary. Add a database for permanent alert history." });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const expected = process.env.TRADINGVIEW_WEBHOOK_SECRET;
  const supplied = req.headers["x-atlas-secret"] || req.query?.secret || req.body?.secret;
  if (expected && supplied !== expected) return res.status(401).json({ error: "Invalid webhook secret." });

  latestSignal = {
    ...(typeof req.body === "object" && req.body ? req.body : { message: String(req.body || "") }),
    receivedAt: new Date().toISOString()
  };
  return res.status(200).json({ ok: true, received: latestSignal });
}
