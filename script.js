const history = [];
const $ = (id) => document.getElementById(id);
let currentSymbol = "NASDAQ:MU";
let latestMarketSnapshot = null;

const WATCHLIST = [
  { proName: "NASDAQ:MU", title: "MU" },
  { proName: "NASDAQ:NVDA", title: "NVDA" },
  { proName: "NASDAQ:MSTR", title: "MSTR" },
  { proName: "NASDAQ:SNDK", title: "SNDK" },
  { proName: "COINBASE:BTCUSD", title: "BTC" },
  { proName: "COINBASE:SOLUSD", title: "SOL" }
];

function addExternalWidget(containerId, src, config) {
  const container = $(containerId);
  container.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = src;
  script.async = true;
  script.textContent = JSON.stringify(config);
  container.appendChild(script);
}

function renderTicker() {
  addExternalWidget("tvTicker", "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js", {
    symbols: WATCHLIST,
    showSymbolLogo: true,
    isTransparent: true,
    displayMode: "adaptive",
    colorTheme: "dark",
    locale: "en"
  });
}

function renderTradingView(symbol) {
  currentSymbol = symbol;
  $("activeSymbolText").textContent = symbol;

  addExternalWidget("tvChart", "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js", {
    autosize: true,
    symbol,
    interval: "D",
    timezone: "America/Los_Angeles",
    theme: "dark",
    style: "1",
    locale: "en",
    backgroundColor: "rgba(3, 12, 18, 1)",
    gridColor: "rgba(32, 246, 199, 0.06)",
    allow_symbol_change: true,
    calendar: false,
    support_host: "https://www.tradingview.com"
  });

  addExternalWidget("tvTechnical", "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js", {
    interval: "1D",
    width: "100%",
    isTransparent: true,
    height: 420,
    symbol,
    showIntervalTabs: true,
    displayMode: "multiple",
    locale: "en",
    colorTheme: "dark"
  });

  loadFinnhub(symbol);

  addExternalWidget("tvFundamentals", "https://s3.tradingview.com/external-embedding/embed-widget-financials.js", {
    isTransparent: true,
    largeChartUrl: "",
    displayMode: "regular",
    width: "100%",
    height: 640,
    colorTheme: "dark",
    symbol,
    locale: "en"
  });
}


function fmtNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: digits });
}

function fmtCompact(value, unitIsMillions = false) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const base = unitIsMillions ? Number(value) * 1_000_000 : Number(value);
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(base);
}

async function loadFinnhub(symbol) {
  $("finnhubStatus").textContent = "Loading live data…";
  try {
    const response = await fetch(`/api/market?symbol=${encodeURIComponent(symbol)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Finnhub request failed.");
    latestMarketSnapshot = data;
    const q = data.quote || {};
    const c = data.company || {};
    const m = data.metrics || {};
    const currency = c.currency || "USD";
    const moneyValue = value => value == null ? "—" : new Intl.NumberFormat("en-US", { style:"currency", currency, maximumFractionDigits:2 }).format(value);

    $("companyName").textContent = c.name || data.symbol || symbol;
    $("livePrice").textContent = moneyValue(q.current);
    const change = Number(q.change);
    const pct = Number(q.percentChange);
    $("liveChange").textContent = Number.isFinite(change) && Number.isFinite(pct) ? `${change >= 0 ? "+" : ""}${change.toFixed(2)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)` : "—";
    $("liveChange").className = change >= 0 ? "positive" : "negative";
    $("openPrice").textContent = moneyValue(q.open);
    $("dayHigh").textContent = moneyValue(q.high);
    $("dayLow").textContent = moneyValue(q.low);
    $("prevClose").textContent = moneyValue(q.previousClose);
    $("marketCap").textContent = c.marketCap == null ? "—" : fmtCompact(c.marketCap, true);
    $("sharesOutstanding").textContent = c.sharesOutstanding == null ? "—" : `${fmtNumber(c.sharesOutstanding, 2)}M`;
    $("peRatio").textContent = fmtNumber(m.peTTM ?? m.peAnnual, 2);
    $("weekRange").textContent = m.week52Low == null || m.week52High == null ? "—" : `${moneyValue(m.week52Low)} – ${moneyValue(m.week52High)}`;
    $("finnhubStatus").textContent = `Updated ${q.timestamp ? new Date(q.timestamp * 1000).toLocaleTimeString() : "now"}`;
  } catch (error) {
    latestMarketSnapshot = null;
    $("finnhubStatus").textContent = error.message;
    $("livePrice").textContent = "—";
    $("liveChange").textContent = "—";
  }
}

function addMessage(role, content, error = false) {
  const el = document.createElement("div");
  el.className = `message ${role}${error ? " error" : ""}`;
  el.textContent = content;
  $("messages").appendChild(el);
  $("messages").scrollTop = $("messages").scrollHeight;
  if (!error) history.push({ role, content });
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[$*#]/g, ""));
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => /zira|samantha|female|google us english/i.test(`${v.name} ${v.voiceURI}`));
  if (preferred) utterance.voice = preferred;
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
}

async function askAtlas(message) {
  addMessage("user", message);
  $("atlasReply").textContent = "Atlas is thinking…";
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, symbol: currentSymbol, history: history.slice(0, -1) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    addMessage("assistant", data.reply);
    $("atlasReply").textContent = data.reply;
    $("statusText").textContent = "AI ONLINE";
    speak(data.reply);
  } catch (error) {
    addMessage("assistant", error.message, true);
    $("atlasReply").textContent = error.message;
    $("statusText").textContent = "AI ERROR";
  }
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function valuationData() {
  const earnings = Number($("earnings").value) * Number($("earningsUnit").value);
  const shares = Number($("shares").value) * Number($("sharesUnit").value);
  const growth = Number($("growth").value);
  return { earnings, shares, growth };
}

function calculateValuation() {
  const { earnings, shares, growth } = valuationData();
  if (!(earnings > 0) || !(shares > 0)) {
    $("valuationResults").innerHTML = '<div class="result rule">Enter earnings and shares above zero.</div>';
    return null;
  }
  const targets = [20, 30, 40].map(multiple => ({ multiple, price: earnings * multiple / shares }));
  const ruleMultiple = growth >= 20 ? 30 : 15;
  const rulePrice = earnings * ruleMultiple / shares;
  $("valuationResults").innerHTML = targets.map(t => `<div class="result"><small>${t.multiple}× target</small><b>${money(t.price)}</b></div>`).join("") + `<div class="result rule"><small>Automatic rule: ${ruleMultiple}× at ${growth.toFixed(1)}% growth</small><b>${money(rulePrice)}</b></div>`;
  return { earnings, shares, growth, targets, ruleMultiple, rulePrice };
}

$("loadSymbol").addEventListener("click", () => renderTradingView($("symbolSelect").value));
$("symbolSelect").addEventListener("change", () => renderTradingView($("symbolSelect").value));
$("calculate").addEventListener("click", calculateValuation);
$("fillShares").addEventListener("click", () => {
  const sharesM = latestMarketSnapshot?.company?.sharesOutstanding;
  if (!(sharesM > 0)) {
    $("atlasReply").textContent = "Finnhub did not return shares outstanding for this symbol.";
    return;
  }
  $("shares").value = sharesM;
  $("sharesUnit").value = "1000000";
  calculateValuation();
  $("atlasReply").textContent = `Loaded ${fmtNumber(sharesM, 2)} million shares outstanding from Finnhub.`;
});
$("sendValuation").addEventListener("click", () => {
  const v = calculateValuation();
  if (!v) return;
  const earningsB = v.earnings / 1e9;
  const sharesB = v.shares / 1e9;
  askAtlas(`Analyze ${currentSymbol} using my valuation formula. Projected quarterly earnings: ${earningsB.toFixed(3)} billion dollars. Shares outstanding: ${sharesB.toFixed(3)} billion. Earnings growth: ${v.growth}%. Automatic multiple: ${v.ruleMultiple}x. Automatic price target: ${money(v.rulePrice)}. Explain the assumptions and risks.`);
});

$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const message = $("chatInput").value.trim();
  if (!message) return;
  $("chatInput").value = "";
  askAtlas(message);
});
$("clearChat").addEventListener("click", () => { history.length = 0; $("messages").innerHTML = ""; });
$("stopVoice").addEventListener("click", () => speechSynthesis?.cancel());

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (Recognition) {
  recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onstart = () => { $("micButton").textContent = "Listening…"; };
  recognition.onend = () => { $("micButton").textContent = "Start listening"; };
  recognition.onerror = event => { $("atlasReply").textContent = `Microphone error: ${event.error}`; };
  recognition.onresult = event => {
    const message = event.results[0][0].transcript;
    $("chatInput").value = message;
    askAtlas(message);
  };
  $("micButton").addEventListener("click", () => recognition.start());
} else {
  $("micButton").disabled = true;
  $("micButton").textContent = "Voice unsupported";
}

async function pollSignal() {
  try {
    const response = await fetch("/api/tradingview");
    if (!response.ok) return;
    const data = await response.json();
    if (data.signal) {
      const s = data.signal;
      $("signalStatus").textContent = `${s.symbol || "Signal"} · ${s.timeframe || ""}\n${s.signal || s.message || JSON.stringify(s)}`;
    }
  } catch (_) {}
}

function animateStars() {
  const canvas = $("stars");
  const ctx = canvas.getContext("2d");
  let stars = [];
  function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    stars = Array.from({ length: Math.min(130, Math.floor(innerWidth / 8)) }, () => ({ x: Math.random()*innerWidth, y: Math.random()*innerHeight, r: Math.random()*1.4+.2, v: Math.random()*.18+.03 }));
  }
  function frame() {
    ctx.clearRect(0,0,innerWidth,innerHeight);
    ctx.fillStyle = "rgba(160,255,235,.7)";
    for (const s of stars) { s.y += s.v; if (s.y > innerHeight) s.y = 0; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); }
    requestAnimationFrame(frame);
  }
  addEventListener("resize", resize); resize(); frame();
}

renderTicker();
renderTradingView(currentSymbol);
calculateValuation();
animateStars();
addMessage("assistant", "Atlas initialized with Finnhub live prices and fundamentals, TradingView charts and technical analysis, plus your valuation calculator.");
pollSignal();
setInterval(pollSignal, 30000);
