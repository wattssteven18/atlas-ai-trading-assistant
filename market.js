export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return res.status(500).json({ error: "FINNHUB_API_KEY is not configured in Vercel." });
  }

  const symbol = String(req.query.symbol || "").trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,15}$/.test(symbol)) {
    return res.status(400).json({ error: "Enter a valid stock ticker." });
  }

  const base = "https://finnhub.io/api/v1";
  const urls = {
    quote: `${base}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`,
    profile: `${base}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`,
    metrics: `${base}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${encodeURIComponent(token)}`,
  };

  try {
    const [quoteRes, profileRes, metricRes] = await Promise.all([
      fetch(urls.quote),
      fetch(urls.profile),
      fetch(urls.metrics),
    ]);

    if (!quoteRes.ok || !profileRes.ok || !metricRes.ok) {
      throw new Error("Finnhub returned an error.");
    }

    const [quoteRaw, profile, metricRaw] = await Promise.all([
      quoteRes.json(),
      profileRes.json(),
      metricRes.json(),
    ]);

    if (!quoteRaw || !Number(quoteRaw.c)) {
      return res.status(404).json({ error: `No Finnhub quote was found for ${symbol}.` });
    }

    const sharesOutstandingBillions = Number(profile.shareOutstanding) > 0
      ? Number(profile.shareOutstanding) / 1000
      : null;

    return res.status(200).json({
      symbol,
      quote: {
        current: Number(quoteRaw.c) || null,
        change: Number(quoteRaw.d) || 0,
        percentChange: Number(quoteRaw.dp) || 0,
        high: Number(quoteRaw.h) || null,
        low: Number(quoteRaw.l) || null,
        open: Number(quoteRaw.o) || null,
        previousClose: Number(quoteRaw.pc) || null,
        timestamp: Number(quoteRaw.t) || null,
      },
      company: {
        name: profile.name || symbol,
        ticker: profile.ticker || symbol,
        exchange: profile.exchange || null,
        industry: profile.finnhubIndustry || null,
        logo: profile.logo || null,
        weburl: profile.weburl || null,
        marketCapitalization: Number(profile.marketCapitalization) || null,
        sharesOutstanding: sharesOutstandingBillions,
        sharesOutstandingSourceUnit: "billions",
      },
      metrics: metricRaw.metric || {},
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: "Unable to retrieve Finnhub data right now." });
  }
}
