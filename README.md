# Atlas — Steven's AI Trading Assistant

## Files
- `index.html` — complete black futuristic interface, voice input/output, watchlist, chat memory, and valuation calculator.
- `api/atlas.js` — secure server-side OpenAI connection.
- `package.json` — deployment metadata.

## Important
Never paste an OpenAI API key into `index.html`, GitHub, or any public browser code. The key belongs in a server environment variable named:

`OPENAI_API_KEY`

## Recommended deployment: Vercel
1. Upload this entire folder to a GitHub repository.
2. Import the repository into Vercel.
3. In Vercel, open Project Settings → Environment Variables.
4. Add `OPENAI_API_KEY` and paste your API key there.
5. Redeploy.
6. Open the Vercel website URL and allow microphone permission.

GitHub Pages alone cannot securely run the `/api/atlas.js` backend. It can display the screen, but the AI brain needs a backend such as Vercel.

## Current features
- Steven's AI Trading Assistant branding
- Black futuristic screen
- Female-leaning browser voice selection
- Speech recognition
- Real AI replies through a secure backend
- Local conversation memory
- MU, NVDA, MSTR, BTCUSD, SOLUSD, SNDK, and Cerebras watchlist
- Steven's 15×/30× earnings-growth rule
- Manual 20×/30×/40× scenario support
- Balance-sheet and technical-analysis prompts
- Mobile responsive layout

## Live data
This version does not invent live stock prices. A market-data API can be connected next.
