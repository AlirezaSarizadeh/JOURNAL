export type TradeResult = "WIN" | "LOSS" | "BE" | "OPEN";
export type TradeDirection = "BUY" | "SELL";

export type WatermarkPosition =
  | "auto"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type TradeTag =
  | "A+"
  | "Breakout"
  | "Scalp"
  | "Reversal"
  | "News"
  | "Mistake"
  | "Discipline";

export type TradeImage = {
  id: string;
  name: string;
  dataUrl: string;
};

export type Trade = {
  id: string;
  tradeDate: string;
  symbol: string;
  direction: TradeDirection;
  result: TradeResult;
  riskAmount: number | "";
  pnl: number | "";
  executionScore: number | "";
  mistake: string;
  notes: string;
  tags: TradeTag[];
  images: TradeImage[];
};

export function emptyTrade(): Trade {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return {
    id: crypto.randomUUID(),
    tradeDate: local,
    symbol: "",
    direction: "BUY",
    result: "WIN",
    riskAmount: "",
    pnl: "",
    executionScore: "",
    mistake: "",
    notes: "",
    tags: [],
    images: [],
  };
}
