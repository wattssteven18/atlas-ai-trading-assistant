export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Atlas, Steven's personal AI trading assistant. You specialize in Micron, Nvidia, MSTR, Bitcoin, Solana, and Steven's custom 20x, 30x, and 40x valuation model. Speak confidently, clearly, and conversationally."
        },
        {
          role: "user",
          content: message
        }
      ]
    })
  });

  const data = await response.json();

  res.status(200).json({
    reply: data.choices?.[0]?.message?.content || "No response."
  });
}
