import { useState, useEffect, useCallback } from "react";

const HOLDINGS = [
  {
    ticker: "VUSXX",
    description: "Vanguard Treasury Money Market",
    quantity: 7531.16 * Math.pow(1 + (0.043 / 365), Math.floor((Date.now() - new Date("2026-06-04").getTime()) / 86400000)),
    cost: 7500.10,
    isMoneyMarket: true,
  },
  {
    ticker: "VOO",
    description: "Vanguard S&P 500 ETF",
    quantity: 7.2262,
    cost: 5000.00,
    isMoneyMarket: false,
  },
  {
    ticker: "QQQM",
    description: "Invesco Nasdaq 100 ETF",
    quantity: 8.23882,
    cost: 2500.00,
    isMoneyMarket: false,
  },
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

export default function App() {
  const [prices, setPrices] = useState({
    VOO: { price: 692.23, prevClose: 692.23, change: 0, changePct: 0 },
    QQQM: { price: 302.79, prevClose: 302.79, change: 0, changePct: 0 },
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    } catch (e) {
      setError("Live prices unavailable — showing last known values");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 60000);
    return () => clearInterval(id);
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
    return { ...h, price, value, dayChangePer, dayChangePct, dayGainLoss, totalGainLoss, totalGainLossPct };
  });

  const totalCost = HOLDINGS.reduce((s, h) => s + h.cost, 0);
  const totalValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const totalDayGL = rows.reduce((s, r) => s + (r.dayGainLoss ?? 0), 0);
  const totalGL = totalValue - totalCost;
  const totalGLPct = (totalGL / totalCost) * 100;

  const colorVal = (n) => (n == null ? dimText : n > 0 ? green : n < 0 ? red : dimText);

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
        opacity: 0.88,
        zIndex: 0,
      }} />

      {/* Overlay — lighter so sunset shows through */}
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
            <div style={{ color: gold, fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "5px" }}>
              Portfolio Tracker
            </div>
            <div style={{ color: purple, fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", textShadow: "0 0 24px rgba(168,85,247,0.6)" }}>
              Account Overview
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
          <div style={{ display: "flex", gap: "24px" }}>
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
          </div>
        </div>

        {/* Holdings Cards */}
        {rows.map((r) => (
          <div key={r.ticker} style={cardStyle}>
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
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#F0F4F8", fontSize: "22px", fontWeight: "700" }}>${fmt(r.price)}</div>
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
