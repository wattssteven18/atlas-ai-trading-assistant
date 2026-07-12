# Atlas — Finnhub + TradingView Upgrade

This version combines:

- Finnhub live quotes and company data
- TradingView charts, financial panels, and technical-analysis widgets
- RSI, MACD, SMA 20/50/200 Pine Script alerts
- Atlas voice chat through the OpenAI API
- Steven's valuation formula and 20x/30x/40x scenarios

## Vercel environment variables

Add these in Vercel → Project → Settings → Environment Variables:

- `OPENAI_API_KEY`
- `FINNHUB_API_KEY`
- `OPENAI_MODEL` (optional, defaults to `gpt-5-mini`)
- `TRADINGVIEW_WEBHOOK_SECRET` (optional until alerts are configured)

Never put API keys in `index.html`, `script.js`, or GitHub.

## Upload to GitHub

Extract the ZIP and upload the contents of this folder to the repository root. The repository root should directly contain `index.html`, `script.js`, `style.css`, `api`, `lib`, and the other project files.

Commit the upload and wait for Vercel to redeploy.

## How it works

`/api/market` calls Finnhub securely from Vercel and returns the latest quote, profile, and available basic metrics. The browser refreshes market data when a symbol is selected.

`/api/chat` also pulls the latest Finnhub snapshot before sending the question to Atlas, allowing Atlas to discuss the current quote and available fundamentals without exposing the Finnhub key.

The free Finnhub plan may not provide every metric or every market in real time. Missing fields appear as a dash instead of being invented.
