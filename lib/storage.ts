import { Trade } from "@/lib/types";

const STORAGE_KEY = "trade-journal-data-v2";

export function saveTrades(trades: Trade[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

export function loadTrades(): Trade[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function downloadJsonBackup(trades: Trade[]) {
  const blob = new Blob([JSON.stringify(trades, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "trade-journal-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

export async function restoreJsonBackup(file: File): Promise<Trade[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Invalid backup file");
  return parsed;
}

export function buildPrintableHtml(trades: Trade[]) {
  const cards = trades
    .map(
      (trade) => `
      <div class="card">
        <div class="title">${trade.symbol} - ${trade.direction} - ${trade.result}</div>
        <div class="meta">${trade.tradeDate.replace("T", " ")}</div>
        <div class="row"><b>Risk:</b> ${trade.riskAmount || "-"}</div>
        <div class="row"><b>PnL:</b> ${trade.pnl || "-"}</div>
        <div class="row"><b>Execution:</b> ${trade.executionScore || "-"}</div>
        <div class="row"><b>Mistake:</b> ${trade.mistake || "-"}</div>
        <div class="row"><b>Notes:</b> ${trade.notes || "-"}</div>
        <div class="row"><b>Tags:</b> ${(trade.tags || []).join(", ") || "-"}</div>
      </div>
    `
    )
    .join("");

  return `
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>Trade Journal</title>
        <style>
          body {
            font-family: Tahoma, sans-serif;
            background: #fff;
            color: #111;
            padding: 24px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
          .card {
            border: 1px solid #ddd;
            border-radius: 16px;
            padding: 16px;
            break-inside: avoid;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 6px;
          }
          .meta {
            color: #666;
            margin-bottom: 10px;
            font-size: 12px;
          }
          .row {
            margin-bottom: 6px;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <h1>ژورنال معاملاتی</h1>
        <div class="grid">${cards}</div>
      </body>
    </html>
  `;
}
