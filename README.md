# Steven AI Assistant

A Vercel-ready personal trading assistant with:

- Finnhub live stock quotes
- Automatic shares-outstanding lookup
- Atlas valuation formula
- TradingView chart and ticker tape
- RSI, MACD, and SMA chart studies
- OpenAI chat
- Browser speech recognition and spoken replies

## Required Vercel environment variables

Add these in **Vercel → Project → Settings → Environment Variables**:

```text
OPENAI_API_KEY=your_openai_key
FINNHUB_API_KEY=your_finnhub_key
```

Apply them to Production, Preview, and Development, then redeploy.

## Upload to GitHub

Upload the contents of this folder to the root of your existing repository:

```text
api/
index.html
style.css
script.js
package.json
vercel.json
README.md
```

Do not upload `.env` or place API keys in GitHub.

## Valuation formula

Automatic mode:

- Growth >= 20%: quarterly estimated earnings × 30 ÷ shares outstanding
- Growth < 20%: quarterly estimated earnings × 15 ÷ shares outstanding

Manual modes: 15×, 20×, 30×, and 40×.

## Important shares-outstanding note

Finnhub's `shareOutstanding` company-profile field is reported in millions of shares.
The server converts it to billions before filling the calculator.

## Voice

Chrome may require microphone permission and a user tap before audio can play.
Tap the glowing orb to speak.
