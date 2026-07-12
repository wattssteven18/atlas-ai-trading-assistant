import { getMarketSnapshot } from "../lib/finnhub.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  const symbol = String(req.query?.symbol || "NASDAQ:MU").trim();

  try {
    const snapshot = await getMarketSnapshot(symbol);
    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
    return res.status(200).json(snapshot);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Unable to load Finnhub data." });
  }
}
