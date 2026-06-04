import { useState, useEffect, useCallback } from "react";

const HOLDINGS = [
 {
  ticker: "VUSXX",
  description: "Vanguard Treasury Money Market",
  quantity: (() => {
    const startValue = 7500.10;
    const dailyRate = 0.043 / 365;
    const startDate = new Date("2026-06-04");
    const today = new Date();
    const days = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    return startValue * Math.pow(1 + dailyRate, days);
  })(),
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
const bg = "#070B14";
const card = "#0D1321";
const border = "#151F33";
const muted = "#3D5068";
const dimText = "#6B84A0";

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

 return (
   <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Courier New', monospace", padding: "16px", boxSizing: "border-box" }}>

     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
       <div>
         <div style={{ color: gold, fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "3px" }}>
           Portfolio Tracker
         </div>
         <div style={{ color: "#F0F4F8", fontSize: "20px", fontWeight: "700", letterSpacing: "-0.5px" }}>
           Mom's Chase Account
         </div>
       </div>
       <div style={{ textAlign: "right" }}>
         <button
           onClick={fetchPrices}
           disabled={loading}
           style={{
             background: loading ? border : gold + "22",
             border: `1px solid ${loading ? muted : gold + "55"}`,
             color: loading ? muted : gold,
             borderRadius: "6px",
             padding: "6px 12px",
             fontSize: "10px",
             letterSpacing: "1px",
             cursor: loading ? "not-allowed" : "pointer",
             fontFamily: "'Courier New', monospace"
           }}>
           {loading ? "UPDATING..." : "↻ REFRESH"}
         </button>
         {lastUpdated && (
           <div style={{ color: muted, fontSize: "9px", marginTop: "4px" }}>
             {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
           </div>
         )}
       </div>
     </div>

     {error && (
       <div style={{ background: red + "15", border: `1px solid ${red}33`, borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" }}>
         <span style={{ color: red, fontSize: "10px" }}>⚠ {error}</span>
       </div>
     )}

     <div style={{
       background: `linear-gradient(135deg, #0D1321 0%, #111827 100%)`,
       border: `1px solid ${border}`,
       borderRadius: "12px",
       padding: "16px",
       marginBottom: "12px",
       position: "relative",
       overflow: "hidden"
     }}>
       <div style={{ position: "absolute", top: 0, right: 0, width: "120px", height: "120px", background: gold + "08", borderRadius: "50%", transform: "translate(30px, -30px)" }} />
       <div style={{ color: dimText, fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>Total Portfolio Value</div>
       <div style={{ color: "#F0F4F8", fontSize: "32px", fontWeight: "700", letterSpacing: "-1px", marginBottom: "6px" }}>
         ${fmt(totalValue)}
       </div>
       <div style={{ display: "flex", gap: "16px" }}>
         <div>
           <span style={{ color: dimText, fontSize: "10px" }}>Day: </span>
           <span style={{ color: colorVal(totalDayGL), fontSize: "12px", fontWeight: "700" }}>
             {fmtDollar(totalDayGL)}
           </span>
         </div>
         <div>
           <span style={{ color: dimText, fontSize: "10px" }}>Total: </span>
           <span style={{ color: colorVal(totalGL), fontSize: "12px", fontWeight: "700" }}>
             {fmtDollar(totalGL)} ({fmtPct(totalGLPct)})
           </span>
         </div>
       </div>
     </div>

     {rows.map((r) => (
       <div key={r.ticker} style={{
         background: card,
         border: `1px solid ${border}`,
         borderRadius: "10px",
         padding: "13px",
         marginBottom: "8px",
         position: "relative",
         overflow: "hidden"
       }}>
         <div style={{
           position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
           background: r.isMoneyMarket ? gold : r.ticker === "VOO" ? "#3B82F6" : "#8B5CF6"
         }} />
         <div style={{ paddingLeft: "8px" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
             <div>
               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                 <span style={{ color: "#F0F4F8", fontSize: "16px", fontWeight: "700" }}>{r.ticker}</span>
                 {!r.isMoneyMarket && r.dayChangePct != null && (
                   <span style={{
                     background: colorVal(r.dayChangePct) + "20",
                     color: colorVal(r.dayChangePct),
                     fontSize: "10px",
                     fontWeight: "700",
                     padding: "2px 7px",
                     borderRadius: "4px"
                   }}>
                     {fmtPct(r.dayChangePct)}
                   </span>
                 )}
                 {r.isMoneyMarket && (
                   <span style={{ background: gold + "20", color: gold, fontSize: "9px", padding: "2px 7px", borderRadius: "4px" }}>
                     MONEY MKT
                   </span>
                 )}
               </div>
               <div style={{ color: dimText, fontSize: "10px", marginTop: "2px" }}>{r.description}</div>
             </div>
             <div style={{ textAlign: "right" }}>
               <div style={{ color: "#F0F4F8", fontSize: "18px", fontWeight: "700" }}>${fmt(r.price)}</div>
               {!r.isMoneyMarket && (
                 <div style={{ color: colorVal(r.dayChangePer), fontSize: "11px" }}>
                   {r.dayChangePer != null ? (r.dayChangePer >= 0 ? "+" : "") + fmtDollar(r.dayChangePer) : "—"}
                 </div>
               )}
             </div>
           </div>
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", borderTop: `1px solid ${border}`, paddingTop: "8px" }}>
             {[
               { label: "Value", value: fmtDollar(r.value), color: "#F0F4F8" },
               { label: "Quantity", value: r.isMoneyMarket ? fmt(r.quantity, 0) : fmt(r.quantity, 4), color: dimText },
               { label: "Cost Basis", value: fmtDollar(r.cost), color: dimText },
               { label: "Day G/L", value: r.isMoneyMarket ? "$0.00" : fmtDollar(r.dayGainLoss), color: r.isMoneyMarket ? dimText : colorVal(r.dayGainLoss) },
               { label: "Total G/L $", value: fmtDollar(r.totalGainLoss), color: colorVal(r.totalGainLoss) },
               { label: "Total G/L %", value: fmtPct(r.totalGainLossPct), color: colorVal(r.totalGainLossPct) },
             ].map((cell) => (
               <div key={cell.label}>
                 <div style={{ color: muted, fontSize: "8px", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "2px" }}>{cell.label}</div>
                 <div style={{ color: cell.color, fontSize: "12px", fontWeight: "600" }}>{cell.value}</div>
               </div>
             ))}
           </div>
         </div>
       </div>
     ))}

     <div style={{
       background: "#0A1020",
       border: `1px solid ${gold}33`,
       borderRadius: "10px",
       padding: "13px",
       marginTop: "4px"
     }}>
       <div style={{ color: gold, fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>
         Portfolio Totals
       </div>
       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
         {[
           { label: "Total Value", value: fmtDollar(totalValue), color: "#F0F4F8" },
           { label: "Total Cost", value: fmtDollar(totalCost), color: dimText },
           { label: "Cash & Sweeps", value: fmtDollar(rows[0].value), color: dimText },
           { label: "Day G/L $", value: fmtDollar(totalDayGL), color: colorVal(totalDayGL) },
           { label: "Total G/L $", value: fmtDollar(totalGL), color: colorVal(totalGL) },
           { label: "Total G/L %", value: fmtPct(totalGLPct), color: colorVal(totalGLPct) },
         ].map((cell) => (
           <div key={cell.label}>
             <div style={{ color: muted, fontSize: "8px", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "2px" }}>{cell.label}</div>
             <div style={{ color: cell.color, fontSize: "13px", fontWeight: "700" }}>{cell.value}</div>
           </div>
         ))}
       </div>
     </div>

     <div style={{ textAlign: "center", marginTop: "12px" }}>
       <div style={{ color: border, fontSize: "9px", letterSpacing: "1px" }}>
         AUTO-REFRESHES EVERY 60 SECONDS DURING MARKET HOURS
       </div>
     </div>
   </div>
 );
}