export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured in Vercel." });
  }

  const { message, history = [], marketContext = null } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "A message is required." });
  }

  const instructions = `
You are Steven's personal trading research assistant.
Be direct, practical, and concise.
Never invent live prices, shares outstanding, earnings, or financial metrics.
When market context is supplied, clearly state that the figures came from the app's current Finnhub pull.
Steven's valuation method is:
- Growth of 20% or more: estimated quarterly earnings × 30 ÷ shares outstanding.
- Growth below 20%: estimated quarterly earnings × 15 ÷ shares outstanding.
- He may manually choose 15×, 20×, 30×, or 40×.
Explain that outputs are research estimates, not guarantees or personalized financial advice.
For technical analysis, discuss RSI, MACD, SMA 20, SMA 50, and SMA 200 when relevant.
`;

  const conversationText = history
    .slice(-10)
    .map(item => `${item.role === "assistant" ? "Assistant" : "Steven"}: ${String(item.content || "")}`)
    .join("\n");

  const input = [
    conversationText,
    marketContext ? `Current market context:\n${JSON.stringify(marketContext)}` : "",
    `Steven: ${message}`,
  ].filter(Boolean).join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions,
        input,
        max_output_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed.",
      });
    }

    const reply =
      data.output_text ||
      data.output
        ?.flatMap(item => item.content || [])
        ?.filter(item => item.type === "output_text")
        ?.map(item => item.text)
        ?.join("\n") ||
      "I could not generate a response.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: "Unable to reach the AI service." });
  }
}
