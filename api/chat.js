export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({
        error: "No message was provided."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "The OpenAI API key is missing in Vercel."
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions:
          "You are Atlas, Steven's personal AI trading assistant. " +
          "You specialize in aggressive growth investing, Micron, Nvidia, " +
          "Strategy, SanDisk, Bitcoin, Solana, and Cerebras. " +
          "Steven uses 20x, 30x, and 40x valuation scenarios. " +
          "Be clear, conversational, honest, and never pretend you have live market data unless it is provided.",
        input: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        error:
          data.error?.message ||
          "OpenAI rejected the request."
      });
    }

    const reply =
      data.output_text ||
      data.output
        ?.flatMap(item => item.content || [])
        ?.find(item => item.type === "output_text")
        ?.text;

    if (!reply) {
      console.error("No reply returned:", data);

      return res.status(500).json({
        error: "OpenAI returned no readable response."
      });
    }

    return res.status(200).json({
      reply: reply
    });

  } catch (error) {
    console.error("Atlas server error:", error);

    return res.status(500).json({
      error: error.message || "Atlas encountered a server error."
    });
  }
}
