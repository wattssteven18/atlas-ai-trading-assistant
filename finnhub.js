const BASE_URL = "https://finnhub.io/api/v1";

const symbolMap = {
  "NASDAQ:MU": { finnhub: "MU", type: "equity" },
  "NASDAQ:NVDA": { finnhub: "NVDA", type: "equity" },
  "NASDAQ:MSTR": { finnhub: "MSTR", type: "equity" },
  "NASDAQ:SNDK": { finnhub: "SNDK", type: "equity" },
  "COINBASE:BTCUSD": { finnhub: "COINBASE:BTC-USD", type: "crypto" },
  "COINBASE:SOLUSD": { finnhub: "COINBASE:SOL-USD", type: "crypto" }
};

export function resolveFinnhubSymbol(input = "NASDAQ:MU") {
  const normalized = String(input).trim().toUpperCase();
  return symbolMap[normalized] || {
    finnhub: normalized.includes(":") ? normalized.split(":").pop() : normalized,
    type: "equity"
  };
}

async function finnhub(path, params = {}) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) throw new Error("FINNHUB_API_KEY is missing in Vercel Environment Variables.");

  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: { "X-Finnhub-Token": token },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Finnhub request failed (${response.status}): ${text.slice(0, 160)}`);
  }
  return response.json();
}

export async function getMarketSnapshot(inputSymbol) {
  const resolved = resolveFinnhubSymbol(inputSymbol);
  const quote = await finnhub("/quote", { symbol: resolved.finnhub });

  let profile = null;
  let metrics = null;
  if (resolved.type === "equity") {
    [profile, metrics] = await Promise.all([
      finnhub("/stock/profile2", { symbol: resolved.finnhub }).catch(() => null),
      finnhub("/stock/metric", { symbol: resolved.finnhub, metric: "all" }).catch(() => null)
    ]);
  }

  const metric = metrics?.metric || {};
  const marketCap = profile?.marketCapitalization ?? metric.marketCapitalization ?? null;
  const sharesOutstanding = profile?.shareOutstanding ?? metric.shareOutstanding ?? null;

  return {
    requestedSymbol: inputSymbol,
    symbol: resolved.finnhub,
    type: resolved.type,
    quote: {
      current: quote?.c ?? null,
      change: quote?.d ?? null,
      percentChange: quote?.dp ?? null,
      high: quote?.h ?? null,
      low: quote?.l ?? null,
      open: quote?.o ?? null,
      previousClose: quote?.pc ?? null,
      timestamp: quote?.t ?? null
    },
    company: profile ? {
      name: profile.name || resolved.finnhub,
      ticker: profile.ticker || resolved.finnhub,
      exchange: profile.exchange || null,
      industry: profile.finnhubIndustry || null,
      country: profile.country || null,
      currency: profile.currency || "USD",
      logo: profile.logo || null,
      weburl: profile.weburl || null,
      marketCap,
      sharesOutstanding
    } : null,
    metrics: resolved.type === "equity" ? {
      peAnnual: metric.peAnnual ?? metric.peTTM ?? null,
      peTTM: metric.peTTM ?? null,
      epsAnnual: metric.epsAnnual ?? null,
      epsTTM: metric.epsTTM ?? null,
      revenuePerShareTTM: metric.revenuePerShareTTM ?? null,
      week52High: metric["52WeekHigh"] ?? null,
      week52Low: metric["52WeekLow"] ?? null,
      beta: metric.beta ?? null,
      currentRatioAnnual: metric.currentRatioAnnual ?? null,
      debtEquityAnnual: metric.totalDebtToEquityAnnual ?? null,
      grossMarginAnnual: metric.grossMarginAnnual ?? null,
      netProfitMarginAnnual: metric.netProfitMarginAnnual ?? null,
      roeAnnual: metric.roeRfy ?? metric.roeAnnual ?? null,
      sharesOutstanding
    } : null,
    source: "Finnhub"
  };
}
