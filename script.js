const $ = (id) => document.getElementById(id);

const state = {
  currentMarket: null,
  conversation: [],
  recognition: null,
  selectedVoice: null,
};

function money(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

function compact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function setError(element, text = "") {
  element.textContent = text;
  element.classList.toggle("hidden", !text);
}

function setStatus(text, online = false) {
  $("connectionStatus").textContent = text;
  $("connectionStatus").classList.toggle("online", online);
}

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  $("chatLog").appendChild(div);
  $("chatLog").scrollTop = $("chatLog").scrollHeight;
}

async function loadMarketData(rawTicker, updateValuation = false) {
  const ticker = String(rawTicker || "").trim().toUpperCase();
  if (!ticker) return;

  setStatus(`Loading ${ticker}…`);
  setError($("marketError"));
  setError($("valuationMessage"));

  try {
    const response = await fetch(`/api/market?symbol=${encodeURIComponent(ticker)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load market data.");

    state.currentMarket = data;
    $("marketTicker").value = ticker;
    $("valuationTicker").value = ticker;

    $("companyName").textContent = data.company.name || ticker;
    $("currentPrice").textContent = money(data.quote.current);
    $("dailyChange").textContent =
      `${money(data.quote.change)} (${Number(data.quote.percentChange || 0).toFixed(2)}%)`;
    $("dailyChange").className = Number(data.quote.change) >= 0 ? "positive" : "negative";
    $("sharesOutstandingDisplay").textContent = data.company.sharesOutstanding
      ? `${Number(data.company.sharesOutstanding).toFixed(3)}B`
      : "Not available";
    $("marketCap").textContent = data.company.marketCapitalization
      ? `${compact(data.company.marketCapitalization * 1_000_000)}`
      : "—";

    const high52 = data.metrics["52WeekHigh"];
    const low52 = data.metrics["52WeekLow"];
    $("weekRange").textContent =
      Number.isFinite(Number(low52)) && Number.isFinite(Number(high52))
        ? `${money(low52)} – ${money(high52)}`
        : "—";

    $("valuationCurrentPrice").textContent = money(data.quote.current);

    if (updateValuation && data.company.sharesOutstanding) {
      $("sharesOutstanding").value = Number(data.company.sharesOutstanding).toFixed(4);
      $("sharesUnit").value = "1000000000";
    }

    setStatus(`${ticker} live`, true);
    return data;
  } catch (error) {
    setStatus("Data error");
    setError($("marketError"), error.message);
    if (updateValuation) setError($("valuationMessage"), error.message);
    throw error;
  }
}

function calculateValuation() {
  setError($("valuationMessage"));

  const earnings = Number($("earningsEstimate").value) * Number($("earningsUnit").value);
  const shares = Number($("sharesOutstanding").value) * Number($("sharesUnit").value);
  const growth = Number($("growthRate").value);
  const mode = $("multipleMode").value;

  if (!(earnings > 0)) {
    setError($("valuationMessage"), "Enter the estimated quarterly earnings.");
    return;
  }
  if (!(shares > 0)) {
    setError($("valuationMessage"), "Load the ticker or enter shares outstanding.");
    return;
  }
  if (!Number.isFinite(growth)) {
    setError($("valuationMessage"), "Enter the earnings growth rate.");
    return;
  }

  const multiple = mode === "auto" ? (growth >= 20 ? 30 : 15) : Number(mode);
  const target = (earnings * multiple) / shares;
  const current = Number(state.currentMarket?.quote?.current);
  const upside = current > 0 ? ((target / current) - 1) * 100 : null;

  $("multipleUsed").textContent = `${multiple}×`;
  $("targetPrice").textContent = money(target);
  $("upsideDownside").textContent = Number.isFinite(upside)
    ? `${upside >= 0 ? "+" : ""}${upside.toFixed(2)}%`
    : "Load current price";
  $("upsideDownside").className = Number.isFinite(upside)
    ? (upside >= 0 ? "positive" : "negative")
    : "";

  return { target, multiple, upside };
}

function renderTradingView(symbol = "NASDAQ:MU") {
  const frame = $("tradingViewChart");
  frame.innerHTML = "";

  const container = document.createElement("div");
  container.className = "tradingview-widget-container";
  container.style.height = "100%";
  container.style.width = "100%";

  const widget = document.createElement("div");
  widget.className = "tradingview-widget-container__widget";
  widget.style.height = "calc(100% - 32px)";
  widget.style.width = "100%";

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  script.async = true;
  script.textContent = JSON.stringify({
    autosize: true,
    symbol,
    interval: "D",
    timezone: "America/Los_Angeles",
    theme: "dark",
    style: "1",
    locale: "en",
    allow_symbol_change: true,
    calendar: false,
    support_host: "https://www.tradingview.com",
    studies: [
      "STD;RSI",
      "STD;MACD",
      "STD;SMA"
    ]
  });

  container.appendChild(widget);
  container.appendChild(script);
  frame.appendChild(container);
}

function chooseVoice() {
  const voices = speechSynthesis.getVoices();
  state.selectedVoice =
    voices.find(v => /female|samantha|zira|google us english/i.test(`${v.name} ${v.voiceURI}`)) ||
    voices.find(v => /^en(-|_)/i.test(v.lang)) ||
    voices[0] ||
    null;
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (state.selectedVoice) utterance.voice = state.selectedVoice;
  utterance.rate = 0.97;
  utterance.pitch = 1.05;
  utterance.onstart = () => {
    $("voiceOrb").classList.add("speaking");
    $("voiceState").textContent = "Speaking…";
  };
  utterance.onend = () => {
    $("voiceOrb").classList.remove("speaking");
    $("voiceState").textContent = "Tap the orb and speak";
  };
  speechSynthesis.speak(utterance);
}

async function askAssistant(message) {
  const clean = String(message || "").trim();
  if (!clean) return;

  addMessage("user", clean);
  state.conversation.push({ role: "user", content: clean });
  $("chatInput").value = "";
  setStatus("Thinking…");

  const marketContext = state.currentMarket
    ? {
        symbol: state.currentMarket.symbol,
        company: state.currentMarket.company,
        quote: state.currentMarket.quote,
        metrics: state.currentMarket.metrics,
      }
    : null;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: clean,
        history: state.conversation.slice(-10),
        marketContext,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Assistant request failed.");

    addMessage("assistant", data.reply);
    state.conversation.push({ role: "assistant", content: data.reply });
    setStatus("Ready", true);
    speak(data.reply);
  } catch (error) {
    const text = `I could not reach the AI service. ${error.message}`;
    addMessage("assistant", text);
    setStatus("AI connection error");
  }
}

function setupVoiceRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    $("voiceState").textContent = "Voice input is not supported in this browser";
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    $("voiceOrb").classList.add("listening");
    $("voiceState").textContent = "Listening…";
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    $("chatInput").value = text;
    askAssistant(text);
  };

  recognition.onerror = (event) => {
    $("voiceState").textContent =
      event.error === "not-allowed" ? "Microphone permission is blocked" : "I could not hear that";
  };

  recognition.onend = () => {
    $("voiceOrb").classList.remove("listening");
    if (!$("voiceOrb").classList.contains("speaking")) {
      $("voiceState").textContent = "Tap the orb and speak";
    }
  };

  state.recognition = recognition;
}

$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  askAssistant($("chatInput").value);
});

$("voiceOrb").addEventListener("click", () => {
  if (state.recognition) {
    try {
      state.recognition.start();
    } catch {
      // Recognition is already active.
    }
  }
});

$("loadMarketBtn").addEventListener("click", () => loadMarketData($("marketTicker").value));
$("marketTicker").addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadMarketData($("marketTicker").value);
});

$("loadValuationTickerBtn").addEventListener("click", async () => {
  try {
    await loadMarketData($("valuationTicker").value, true);
  } catch {
    // Error is shown in the UI.
  }
});

$("calculateBtn").addEventListener("click", calculateValuation);

$("loadChartBtn").addEventListener("click", () => {
  const symbol = $("chartTicker").value.trim().toUpperCase() || "NASDAQ:MU";
  renderTradingView(symbol);
});

speechSynthesis.onvoiceschanged = chooseVoice;
chooseVoice();
setupVoiceRecognition();
renderTradingView("NASDAQ:MU");
addMessage("assistant", "Ready. Load a ticker, ask me a question, or run your valuation.");
loadMarketData("MU", true).catch(() => {});
