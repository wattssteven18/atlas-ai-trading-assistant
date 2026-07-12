import OpenAI from "openai";
import { getMarketSnapshot } from "../lib/finnhub.js";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const instructions = `You are Atlas, Steven's direct, practical AI trading research assistant.
You analyze companies, balance sheets, technical setups, risks, and valuation scenarios.
The active symbol and a live Finnhub market snapshot may be supplied with each request.
Use the supplied live price and fundamental values when present. State when a field is unavailable.
The user's valuation rule is: projected quarterly earnings multiplied by 30 when earnings growth is at least 20%, otherwise multiplied by 15, then divided by shares outstanding. Also show 20x, 30x, and 40x scenarios when useful.
Never pretend you can read values displayed inside an embedded TradingView widget. Use TradingView values only when the user or a webhook provides them.
Never claim to continuously monitor markets unless a real persistent alert/database service is connected.
Separate facts, assumptions, calculations, and risks. Keep answers concise and readable aloud. This is research, not financial advice.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  const message = String(req.body?.message || "").trim();
  const symbol = String(req.body?.symbol || "Unknown").trim();
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
  if (!message) return res.status(400).json({ error: "Message is required." });
  if (!client) return res.status(503).json({ error: "OPENAI_API_KEY is missing in Vercel Environment Variables." });

  try {
    let marketSnapshot = null;
    try {
      marketSnapshot = await getMarketSnapshot(symbol);
    } catch (marketError) {
      marketSnapshot = { error: marketError?.message || "Finnhub data unavailable." };
    }

    const input = [
      ...history.map(item => ({ role: item.role === "assistant" ? "assistant" : "user", content: String(item.content || "") })),
      {
        role: "user",
        content: `Active symbol: ${symbol}\nLive Finnhub snapshot: ${JSON.stringify(marketSnapshot)}\n\nUser request: ${message}`
      }
    ];

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions,
      input
    });
    return res.status(200).json({ reply: response.output_text || "I could not produce a response.", marketSnapshot });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Atlas could not reach the AI service." });
  }
}
