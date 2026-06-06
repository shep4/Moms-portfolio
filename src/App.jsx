import { useState, useEffect, useCallback } from "react";

const HOLDINGS = [
  {
    ticker: "VUSXX",
    description: "Vanguard Treasury Money Market",
    quantity: 7531.16 * Math.pow(1 + (0.043 / 365), Math.floor((Date.now() - new Date("2026-06-04").getTime()) / 86400000)),
    cost: 7500.10,
    isMoneyMarket: true,
    entryPrice: 1.00,
    dividendYield: 0.043,
  },
  {
    ticker: "VOO",
    description: "Vanguard S&P 500 ETF",
    quantity: 7.2262,
    cost: 5000.00,
    isMoneyMarket: false,
    entryPrice: 691.94,
    dividendYield: 0.013,
  },
  {
    ticker: "QQQM",
    description: "Invesco Nasdaq 100 ETF",
    quantity: 8.23882,
    cost: 2500.00,
    isMoneyMarket: false,
    entryPrice: 303.41,
    dividendYield: 0.006,
  },
];

const PROJECTIONS = [
  { label: "Conservative", rate: 0.07, color: "#60A5FA" },
  { label: "Base Case", rate: 0.10, color: "#00D68F" },
  { label: "Bull Case", rate: 0.15, color: "#F5A623" },
];

const SCENARIOS = [
  { label: "Gap Fill (-340 NQ pts)", vooAdj: -0.018, qqqmAdj: -0.028 },
  { label: "5% Correction", vooAdj: -0.05, qqqmAdj: -0.05 },
  { label: "10% Correction", vooAdj: -0.10, qqqmAdj: -0.10 },
  { label: "15% Correction", vooAdj: -0.15, qqqmAdj: -0.15 },
];

const fmt = (n, digits = 2) =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtDollar = (n) => {
  if (n == null) return "—";
  const abs = Math.abs(n);
  return (n < 0 ? "-$" : "$") + fmt(abs);
};

const fmtPct = (n) => {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + fmt(n) + "%";
};

const green = "#00D68F";
const red = "#FF4D6A";
const gold = "#F5A623";
const purple = "#A855F7";
const border = "#1E2A3A";
const muted = "#4A6080";
const dimText = "#8AA4C0";

// Market hours check
const getMarketStatus = () => {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const time = hours * 60 + minutes;
  if (day === 0 || day === 6) return { label: "Market Closed", color: red, sub: "Weekend" };
  if (time >= 240 && time < 570) return { label: "Pre-Market", color: gold, sub: "4:00 AM – 9:30 AM ET" };
  if (time >= 570 && time < 960) return { label: "Market Open", color: green, sub: "9:30 AM – 4:00 PM ET" };
  if (time >= 960 && time < 1200) return { label: "After Hours", color: gold, sub: "4:00 PM – 8:00 PM ET" };
  return { label: "Market Closed", color: red, sub: "Opens 9:30 AM ET" };
};

export default function App() {
  const [prices, setPrices] = useState({
    VOO: { price: 692.23, prevClose: 692.23, change: 0, changePct: 0, week52High: 0, week52Low: 0 },
    QQQM: { price: 302.79, prevClose: 302.79, change: 0, changePct: 0, week52High: 0, week52Low: 0 },
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [intelOpen, setIntelOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = {};
      for (const ticker of ["VOO", "QQQM"]) {
        const res = await fetch(`/api/quote?ticker=${ticker}`);
        if (!res.ok) throw new Error(`Failed to fetch ${ticker}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        results[ticker] = data;
      }
      setPrices(results);
      setLastUpdated(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    } catch (e) {
      setError("Live prices unavailable — showing last known values");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const priceId = setInterval(fetchPrices, 60000);
    const marketId = setInterval(() => setMarketStatus(getMarketStatus()), 30000);
    return () => { clearInterval(priceId); clearInterval(marketId); };
  }, [fetchPrices]);

  const rows = HOLDINGS.map((h) => {
    const priceData = h.isMoneyMarket ? null : prices[h.ticker];
    const price = h.isMoneyMarket ? 1.00 : (priceData?.price ?? null);
    const value = price != null ? price * h.quantity : null;
    const dayChangePer = h.isMoneyMarket ? 0 : (priceData?.change ?? null);
    const dayChangePct = h.isMoneyMarket ? 0 : (priceData?.changePct ?? null);
    const dayGainLoss = h.isMoneyMarket ? 0 : (dayChangePer != null ? dayChangePer * h.quantity : null);
    const totalGainLoss = value != null ? value - h.cost : null;
    const totalGainLossPct = totalGainLoss != null ? (totalGainLoss / h.cost) * 100 : null;
    const fromEntry = price != null ? ((price - h.entryPrice) / h.entryPrice) * 100 : null;
    const annualDividend = value != null ? value * h.dividendYield : null;
    const week52High = priceData?.week52High ?? null;
    const week52Low = priceData?.week52Low ?? null;
    return { ...h, price, value, dayChangePer, dayChangePct, dayGainLoss, totalGainLoss, totalGainLossPct, fromEntry, annualDividend, week52High, week52Low };
  });

  const totalCost = HOLDINGS.reduce((s, h) => s + h.cost, 0);
  const totalValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const totalDayGL = rows.reduce((s, r) => s + (r.dayGainLoss ?? 0), 0);
  const totalGL = totalValue - totalCost;
  const totalGLPct = (totalGL / totalCost) * 100;
  const totalAnnualDividend = rows.reduce((s, r) => s + (r.annualDividend ?? 0), 0);

  const colorVal = (n) => (n == null ? dimText : n > 0 ? green : n < 0 ? red : dimText);

  const vooPrice = prices.VOO.price;
  const qqqmPrice = prices.QQQM.price;
  const vusxxValue = rows[0].value ?? 7531.16;

  const scenarioResults = SCENARIOS.map(s => {
    const vooScenario = vooPrice * (1 + s.vooAdj);
    const qqqmScenario = qqqmPrice * (1 + s.qqqmAdj);
    const portfolioValue = vusxxValue + (vooScenario * 7.2262) + (qqqmScenario * 8.23882);
    const drawdown = portfolioValue - totalValue;
    return { ...s, vooScenario, qqqmScenario, portfolioValue, drawdown };
  });

  const projectionResults = PROJECTIONS.map(p => {
    const equityBase = totalValue - vusxxValue;
    const vusxxProjected7 = vusxxValue * Math.pow(1 + 0.043, 7);
    const vusxxProjected10 = vusxxValue * Math.pow(1 + 0.043, 10);
    const equity7 = equityBase * Math.pow(1 + p.rate, 7);
    const equity10 = equityBase * Math.pow(1 + p.rate, 10);
    return { ...p, year7: vusxxProjected7 + equity7, year10: vusxxProjected10 + equity10 };
  });

  const cardStyle = {
    background: "rgba(8, 12, 24, 0.80)",
    border: `1px solid ${border}`,
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "12px",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    position: "relative",
    overflow: "hidden",
  };

  const getCardTint = (r) => {
    if (r.isMoneyMarket) return "rgba(8, 12, 24, 0.80)";
    if (r.totalGainLoss > 0) return "rgba(0, 214, 143, 0.06)";
    if (r.totalGainLoss < 0) return "rgba(8, 12, 24, 0.92)";
    return "rgba(8, 12, 24, 0.80)";
  };

  return (
    <div style={{
      minHeight: "100vh",
      fontFamily: "'Courier New', monospace",
      padding: "16px",
      paddingBottom: "160px",
      boxSizing: "border-box",
      position: "relative",
    }}>

      {/* Sunset Background */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: "url('/sunset.png')",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        opacity: 0.85,
        zIndex: 0,
      }} />

      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "linear-gradient(to bottom, rgba(5,8,18,0.20) 0%, rgba(5,8,18,0.45) 50%, rgba(5,8,18,0.75) 100%)",
        zIndex: 1,
      }} />

      {/* Cardinal */}
      <img
        src="/cardinal.png"
        alt=""
        style={{
          position: "fixed",
          bottom: "0px",
          right: "0px",
          width: "150px",
          opacity: 1,
          zIndex: 10,
          pointerEvents: "none",
          filter: "drop-shadow(0 0 16px rgba(168,85,247,0.5))",
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ color: gold, fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "5px", fontWeight: "700", textShadow: "0 0 8px #FFFFFF, 0 0 16px #FFFFFF" }}>
              Portfolio Tracker
            </div>
            <div style={{ color: purple, fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", textShadow: "0 0 24px rgba(168,85,247,0.6)" }}>
              Account Overview
            </div>
            {/* Market Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: marketStatus.color,
                boxShadow: `0 0 6px ${marketStatus.color}`,
                animation: marketStatus.label === "Market Open" ? "pulse 2s infinite" : "none",
              }} />
              <span style={{ color: marketStatus.color, fontSize: "11px", fontWeight: "700" }}>{marketStatus.label}</span>
              <span style={{ color: dimText, fontSize: "10px" }}>· {marketStatus.sub}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <button
              onClick={fetchPrices}
              disabled={loading}
              style={{
                background: loading ? "rgba(30,42,58,0.8)" : "rgba(168,85,247,0.18)",
                border: `1px solid ${loading ? muted : purple + "99"}`,
                color: loading ? muted : "#FFFFFF",
                fontWeight: "700",
                textShadow: loading ? "none" : "0 0 8px #00FF88, 0 0 16px #00FF88",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "11px",
                letterSpacing: "1px",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Courier New', monospace",
                backdropFilter: "blur(8px)",
                boxShadow: pulse ? `0 0 20px ${green}` : "none",
                transition: "box-shadow 0.3s ease",
              }}>
              {loading ? "UPDATING..." : "↻ REFRESH"}
            </button>
            {lastUpdated && (
              <div style={{ color: "#FFFFFF", fontWeight: "700", fontSize: "10px", marginTop: "5px", textShadow: "0 0 8px #00FF88, 0 0 14px #00FF88" }}>
                {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: red + "15", border: `1px solid ${red}33`, borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
            <span style={{ color: red, fontSize: "12px" }}>⚠ {error}</span>
          </div>
        )}

        {/* Total Value Hero */}
        <div style={{
          ...cardStyle,
          background: "rgba(8, 12, 24, 0.85)",
          border: `1px solid ${purple}44`,
          marginBottom: "16px",
        }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "180px", height: "180px", background: purple + "08", borderRadius: "50%", transform: "translate(50px, -50px)" }} />
          <div style={{ color: dimText, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
            Total Portfolio Value
          </div>
          <div style={{ color: "#F0F4F8", fontSize: "38px", fontWeight: "700", letterSpacing: "-1px", marginBottom: "10px" }}>
            ${fmt(totalValue)}
          </div>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div>
              <span style={{ color: dimText, fontSize: "12px" }}>Day: </span>
              <span style={{ color: colorVal(totalDayGL), fontSize: "15px", fontWeight: "700" }}>
                {fmtDollar(totalDayGL)}
              </span>
            </div>
            <div>
              <span style={{ color: dimText, fontSize: "12px" }}>Total: </span>
              <span style={{ color: colorVal(totalGL), fontSize: "15px", fontWeight: "700" }}>
                {fmtDollar(totalGL)} ({fmtPct(totalGLPct)})
              </span>
            </div>
            <div>
              <span style={{ color: dimText, fontSize: "12px" }}>Est. Annual Div: </span>
              <span style={{ color: green, fontSize: "15px", fontWeight: "700" }}>
                {fmtDollar(totalAnnualDividend)}
              </span>
            </div>
          </div>
        </div>

        {/* Holdings Cards */}
        {rows.map((r) => (
          <div key={r.ticker} style={{
            ...cardStyle,
            background: getCardTint(r),
            border: `1px solid ${r.isMoneyMarket ? border : r.totalGainLoss > 0 ? green + "33" : r.totalGainLoss < 0 ? red + "33" : border}`,
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "4px",
              background: r.isMoneyMarket ? gold : r.ticker === "VOO" ? "#3B82F6" : purple,
              borderRadius: "16px 0 0 16px",
            }} />
            <div style={{ paddingLeft: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "#F0F4F8", fontSize: "20px", fontWeight: "700" }}>{r.ticker}</span>
                    {!r.isMoneyMarket && r.dayChangePct != null && (
                      <span style={{
                        background: colorVal(r.dayChangePct) + "25",
                        color: colorVal(r.dayChangePct),
                        fontSize: "12px",
                        fontWeight: "700",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        border: `1px solid ${colorVal(r.dayChangePct)}33`,
                      }}>
                        {fmtPct(r.dayChangePct)}
                      </span>
                    )}
                    {r.isMoneyMarket && (
                      <span style={{
                        background: gold + "20",
                        color: gold,
                        fontSize: "11px",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        border: `1px solid ${gold}33`,
                      }}>
                        MONEY MKT
                      </span>
                    )}
                  </div>
                  <div style={{ color: dimText, fontSize: "13px", marginTop: "4px" }}>{r.description}</div>
                  {!r.isMoneyMarket && r.fromEntry != null && (
                    <div style={{ marginTop: "4px" }}>
                      <span style={{ color: dimText, fontSize: "11px" }}>From entry: </span>
                      <span style={{ color: colorVal(r.fromEntry), fontSize: "11px", fontWeight: "700" }}>
                        {fmtPct(r.fromEntry)}
                      </span>
                    </div>
                  )}
                  {!r.isMoneyMarket && r.annualDividend != null && (
                    <div style={{ marginTop: "3px" }}>
                      <span style={{ color: dimText, fontSize: "11px" }}>Est. div: </span>
                      <span style={{ color: green, fontSize: "11px", fontWeight: "700" }}>
                        {fmtDollar(r.annualDividend)}/yr
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#F0F4F8", fontSize: "22px", fontWeight: "700" }}>${fmt(r.price)}</div>
                  {!r.isMoneyMarket && (
                    <div style={{ color: dimText, fontSize: "11px", marginTop: "2px" }}>
                      Entry: ${fmt(r.entryPrice)}
                    </div>
                  )}
                  {!r.isMoneyMarket && (
                    <div style={{ color: colorVal(r.dayChangePer), fontSize: "13px", marginTop: "3px" }}>
                      {r.dayChangePer != null ? (r.dayChangePer >= 0 ? "+" : "") + fmtDollar(r.dayChangePer) : "—"}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", borderTop: `1px solid ${border}`, paddingTop: "12px" }}>
                {[
                  { label: "Value", value: fmtDollar(r.value), color: "#F0F4F8" },
                  { label: "Quantity", value: r.isMoneyMarket ? fmt(r.quantity, 2) : fmt(r.quantity, 4), color: dimText },
                  { label: "Cost Basis", value: fmtDollar(r.cost), color: dimText },
                  { label: "Day G/L", value: r.isMoneyMarket ? "$0.00" : fmtDollar(r.dayGainLoss), color: r.isMoneyMarket ? dimText : colorVal(r.dayGainLoss) },
                  { label: "Total G/L $", value: fmtDollar(r.totalGainLoss), color: colorVal(r.totalGainLoss) },
                  { label: "Total G/L %", value: fmtPct(r.totalGainLossPct), color: colorVal(r.totalGainLossPct) },
                ].map((cell) => (
                  <div key={cell.label}>
                    <div style={{ color: muted, fontSize: "10px", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "4px" }}>{cell.label}</div>
                    <div style={{ color: cell.color, fontSize: "15px", fontWeight: "600" }}>{cell.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Totals */}
        <div style={{
          ...cardStyle,
          background: "rgba(8, 12, 24, 0.88)",
          border: `1px solid ${purple}55`,
        }}>
          <div style={{ color: purple, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px", fontWeight: "700" }}>
            Portfolio Totals
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            {[
              { label: "Total Value", value: fmtDollar(totalValue), color: "#F0F4F8" },
              { label: "Total Cost", value: fmtDollar(totalCost), color: dimText },
              { label: "Cash & Sweeps", value: fmtDollar(rows[0].value), color: dimText },
              { label: "Day G/L $", value: fmtDollar(totalDayGL), color: colorVal(totalDayGL) },
              { label: "Total G/L $", value: fmtDollar(totalGL), color: colorVal(totalGL) },
              { label: "Total G/L %", value: fmtPct(totalGLPct), color: colorVal(totalGLPct) },
            ].map((cell) => (
              <div key={cell.label}>
                <div style={{ color: muted, fontSize: "10px", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "4px" }}>{cell.label}</div>
                <div style={{ color: cell.color, fontSize: "15px", fontWeight: "700" }}>{cell.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Intelligence */}
        <div style={{
          ...cardStyle,
          background: "rgba(8, 12, 24, 0.90)",
          border: `2px solid ${gold}`,
          boxShadow: `0 0 12px ${gold}88, 0 0 24px ${gold}44`,
          cursor: "pointer",
        }} onClick={() => setIntelOpen(!intelOpen)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: gold, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "700" }}>
              ⚡ Portfolio Intelligence
            </div>
            <div style={{ color: gold, fontSize: "16px" }}>{intelOpen ? "▲" : "▼"}</div>
          </div>
          {!intelOpen && (
            <div style={{
              color: "#FFFFFF",
              fontSize: "12px",
              marginTop: "8px",
              fontWeight: "700",
              textDecoration: "underline",
              textShadow: "0 0 8px #000000, 0 0 16px #000000",
            }}>
              Scenarios · Projections · Entry analysis — tap to expand
            </div>
          )}
        </div>

        {intelOpen && (
          <>
            {/* Entry Analysis */}
            <div style={{ ...cardStyle, border: `1px solid ${gold}33` }}>
              <div style={{ color: gold, fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px", fontWeight: "700" }}>
                Entry Analysis
              </div>
              {rows.filter(r => !r.isMoneyMarket).map(r => (
                <div key={r.ticker} style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: `1px solid ${border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#F0F4F8", fontSize: "16px", fontWeight: "700" }}>{r.ticker}</span>
                    <span style={{ color: colorVal(r.fromEntry), fontSize: "14px", fontWeight: "700" }}>
                      {fmtPct(r.fromEntry)} from entry
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    {[
                      { label: "Entry Price", value: `$${fmt(r.entryPrice)}`, color: dimText },
                      { label: "Current", value: `$${fmt(r.price)}`, color: "#F0F4F8" },
                      { label: "Breakeven", value: r.fromEntry != null ? (r.fromEntry >= 0 ? "✅ Above" : "⚠ Below") : "—", color: r.fromEntry >= 0 ? green : red },
                    ].map(cell => (
                      <div key={cell.label}>
                        <div style={{ color: muted, fontSize: "9px", textTransform: "uppercase", marginBottom: "3px" }}>{cell.label}</div>
                        <div style={{ color: cell.color, fontSize: "13px", fontWeight: "600" }}>{cell.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Dividend Summary */}
            <div style={{ ...cardStyle, border: `1px solid ${green}33` }}>
              <div style={{ color: green, fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px", fontWeight: "700" }}>
                Estimated Dividend Income
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                {[
                  { label: "Annual", value: fmtDollar(totalAnnualDividend), color: green },
                  { label: "Monthly Est.", value: fmtDollar(totalAnnualDividend / 12), color: green },
                  { label: "Quarterly Est.", value: fmtDollar(totalAnnualDividend / 4), color: green },
                ].map(cell => (
                  <div key={cell.label}>
                    <div style={{ color: muted, fontSize: "9px", textTransform: "uppercase", marginBottom: "3px" }}>{cell.label}</div>
                    <div style={{ color: cell.color, fontSize: "15px", fontWeight: "700" }}>{cell.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${border}`, paddingTop: "12px" }}>
                {rows.filter(r => !r.isMoneyMarket).map(r => (
                  <div key={r.ticker} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: dimText, fontSize: "12px" }}>{r.ticker} ({(r.dividendYield * 100).toFixed(1)}% yield)</span>
                    <span style={{ color: green, fontSize: "12px", fontWeight: "700" }}>{fmtDollar(r.annualDividend)}/yr</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                  <span style={{ color: dimText, fontSize: "12px" }}>VUSXX (4.3% yield)</span>
                  <span style={{ color: green, fontSize: "12px", fontWeight: "700" }}>{fmtDollar(rows[0].annualDividend)}/yr</span>
                </div>
              </div>
            </div>

            {/* Downside Scenarios */}
            <div style={{ ...cardStyle, border: `1px solid ${red}33` }}>
              <div style={{ color: red, fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px", fontWeight: "700" }}>
                Downside Scenarios
              </div>
              {scenarioResults.map((s, i) => (
                <div key={i} style={{ marginBottom: i < scenarioResults.length - 1 ? "14px" : 0, paddingBottom: i < scenarioResults.length - 1 ? "14px" : 0, borderBottom: i < scenarioResults.length - 1 ? `1px solid ${border}` : "none" }}>
                  <div style={{ color: "#F0F4F8", fontSize: "13px", fontWeight: "700", marginBottom: "8px" }}>{s.label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                    {[
                      { label: "VOO", value: `$${fmt(s.vooScenario)}`, color: red },
                      { label: "QQQM", value: `$${fmt(s.qqqmScenario)}`, color: red },
                      { label: "Portfolio", value: fmtDollar(s.portfolioValue), color: "#F0F4F8" },
                      { label: "Drawdown", value: fmtDollar(s.drawdown), color: red },
                    ].map(cell => (
                      <div key={cell.label}>
                        <div style={{ color: muted, fontSize: "9px", textTransform: "uppercase", marginBottom: "3px" }}>{cell.label}</div>
                        <div style={{ color: cell.color, fontSize: "12px", fontWeight: "600" }}>{cell.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 7-10 Year Projections */}
            <div style={{ ...cardStyle, border: `1px solid ${green}33` }}>
              <div style={{ color: green, fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px", fontWeight: "700" }}>
                7–10 Year Projections
              </div>
              <div style={{ color: dimText, fontSize: "10px", marginBottom: "14px" }}>
                Equity at rate shown · VUSXX at 4.3% · Starting ${fmt(totalValue)}
              </div>
              {projectionResults.map((p, i) => (
                <div key={i} style={{ marginBottom: i < projectionResults.length - 1 ? "14px" : 0, paddingBottom: i < projectionResults.length - 1 ? "14px" : 0, borderBottom: i < projectionResults.length - 1 ? `1px solid ${border}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ color: p.color, fontSize: "13px", fontWeight: "700" }}>{p.label}</span>
                    <span style={{ color: dimText, fontSize: "11px" }}>{(p.rate * 100).toFixed(0)}%/yr on equities</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    {[
                      { label: "Year 7", value: fmtDollar(p.year7), color: p.color },
                      { label: "Year 10", value: fmtDollar(p.year10), color: p.color },
                      { label: "10yr Gain", value: fmtDollar(p.year10 - totalValue), color: green },
                    ].map(cell => (
                      <div key={cell.label}>
                        <div style={{ color: muted, fontSize: "9px", textTransform: "uppercase", marginBottom: "3px" }}>{cell.label}</div>
                        <div style={{ color: cell.color, fontSize: "14px", fontWeight: "700" }}>{cell.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <div style={{ color: purple, fontSize: "12px", letterSpacing: "1.5px", opacity: 0.9, fontWeight: "600" }}>
            AUTO-REFRESHES EVERY 60 SECONDS DURING MARKET HOURS
          </div>
        </div>

      </div>
    </div>
  );
}
