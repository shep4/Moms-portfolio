export default async function handler(req, res) {
  const { ticker } = req.query;
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`,
      { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
    );
    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error("No data");
    const price = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    res.status(200).json({ price, prevClose, change, changePct });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}