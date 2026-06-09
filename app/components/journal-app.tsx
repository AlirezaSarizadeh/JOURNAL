"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, DragEvent, ChangeEvent } from "react";
import { toPng } from "html-to-image";
import {
  Check,
  Download,
  Eye,
  FileImage,
  FileJson,
  Filter,
  ImageDown,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  buildPrintableHtml,
  downloadJsonBackup,
  loadTrades,
  restoreJsonBackup,
  saveTrades,
} from "@/lib/storage";
import {
  emptyTrade,
  Trade,
  TradeImage,
  TradeTag,
  WatermarkPosition,
} from "@/lib/types";

type WatermarkMode = "compact" | "detailed";
type ResolvedWatermarkPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const ALL_TAGS: TradeTag[] = [
  "A+",
  "Breakout",
  "Scalp",
  "Reversal",
  "News",
  "Mistake",
  "Discipline",
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function shellPanel() {
  return "rounded-[28px] border border-white/10 bg-white/[0.05] shadow-[0_12px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl";
}

function subtlePanel() {
  return "rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl";
}

function glassInput() {
  return "w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white shadow-inner shadow-black/10 outline-none transition-all placeholder:text-slate-500 focus:border-sky-400/70 focus:bg-slate-950/55 focus:ring-4 focus:ring-sky-500/10";
}

function glassTextarea() {
  return `${glassInput()} resize-y min-h-[120px]`;
}

function glassSelect() {
  return `${glassInput()} appearance-none`;
}

function primaryButton() {
  return "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-sky-950/20 transition hover:scale-[1.01] hover:from-sky-400 hover:to-indigo-400 active:scale-[0.99]";
}

function secondaryButton() {
  return "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function dangerButton() {
  return "inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-500";
}

function miniButton() {
  return "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition";
}

function labelClass() {
  return "mb-2 block text-xs font-medium tracking-wide text-slate-300";
}

function helperClass() {
  return "mt-1 text-[11px] text-slate-500";
}

function tagBadgeClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-[11px] transition",
    active
      ? "border-sky-400/50 bg-sky-500/15 text-sky-200"
      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
  );
}

function resultBadge(result: Trade["result"]) {
  if (result === "WIN") return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
  if (result === "LOSS") return "bg-rose-500/15 text-rose-300 border-rose-400/30";
  if (result === "BE") return "bg-amber-500/15 text-amber-300 border-amber-400/30";
  return "bg-sky-500/15 text-sky-300 border-sky-400/30";
}

function statCardClass() {
  return "rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.16)] backdrop-blur";
}

function formatTradeDate(value: string) {
  return value.replace("T", " ");
}

function getResultLabel(result: Trade["result"]) {
  if (result === "WIN") return "برد";
  if (result === "LOSS") return "باخت";
  if (result === "BE") return "سر‌به‌سر";
  return "باز";
}

function getDirectionLabel(direction: Trade["direction"]) {
  return direction === "BUY" ? "خرید" : "فروش";
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  } else {
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();
  }
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.stroke();
  } else {
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.stroke();
  }
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const clean = paragraph.trim();

    if (!clean) {
      lines.push("");
      continue;
    }

    const words = clean.split(/\s+/);
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;

      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) {
          lines.push(current);
          current = "";
        }

        if (ctx.measureText(word).width <= maxWidth) {
          current = word;
        } else {
          let chunk = "";
          for (const char of word) {
            const testChunk = chunk + char;
            if (ctx.measureText(testChunk).width <= maxWidth) {
              chunk = testChunk;
            } else {
              if (chunk) lines.push(chunk);
              chunk = char;
            }
          }
          current = chunk;
        }
      }
    }

    if (current) lines.push(current);
  }

  return lines;
}

function ellipsizeSingleLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  const suffix = " ...";
  while (value && ctx.measureText(value + suffix).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}${suffix}`;
}

function ellipsizeLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxLines: number,
  maxWidth: number
) {
  if (lines.length <= maxLines) return lines;
  const result = lines.slice(0, maxLines);
  const lastIndex = maxLines - 1;
  result[lastIndex] = ellipsizeSingleLine(ctx, result[lastIndex] ?? "", maxWidth);
  return result;
}

async function loadFontForCanvas() {
  try {
    await document.fonts.load('700 18px "Vazirmatn"');
    await document.fonts.load('600 16px "Vazirmatn"');
    await document.fonts.load('500 14px "Vazirmatn"');
    await document.fonts.ready;
  } catch { }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
  });
  return img;
}

function buildWatermarkText(trade: Trade) {
  const parts: string[] = [];
  if (trade.mistake.trim()) parts.push(`اشتباه: ${trade.mistake.trim()}`);
  if (trade.notes.trim()) parts.push(`یادداشت: ${trade.notes.trim()}`);
  if (trade.tags.length) parts.push(`تگ‌ها: ${trade.tags.join("، ")}`);
  return parts.join("\n\n");
}

function getAccentColor(result: Trade["result"]) {
  if (result === "WIN") return "rgba(16,185,129,0.95)";
  if (result === "LOSS") return "rgba(244,63,94,0.95)";
  if (result === "BE") return "rgba(245,158,11,0.95)";
  return "rgba(56,189,248,0.95)";
}

type ThemeStyle = {
  panelFill: string;
  panelStroke: string;
  bodyFill: string;
  bodyStroke: string;
  titleColor: string;
  metaColor: string;
  softColor: string;
  noteColor: string;
  shadowColor: string;
};

function sampleImageBrightness(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  try {
    const sampleW = Math.min(width, 80);
    const sampleH = Math.min(height, 80);
    const offsetX = Math.max(0, Math.floor(width / 2 - sampleW / 2));
    const offsetY = Math.max(0, Math.floor(height / 2 - sampleH / 2));
    const data = ctx.getImageData(offsetX, offsetY, sampleW, sampleH).data;

    let total = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      total += brightness;
      count += 1;
    }

    return count ? total / count : 128;
  } catch {
    return 128;
  }
}

function getAdaptiveTheme(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): ThemeStyle {
  const brightness = sampleImageBrightness(ctx, canvasWidth, canvasHeight);
  const isBright = brightness > 150;

  if (isBright) {
    return {
      panelFill: "rgba(2, 6, 23, 0.58)",
      panelStroke: "rgba(255,255,255,0.20)",
      bodyFill: "rgba(255,255,255,0.05)",
      bodyStroke: "rgba(255,255,255,0.09)",
      titleColor: "rgba(255,255,255,0.98)",
      metaColor: "rgba(226,232,240,0.92)",
      softColor: "rgba(191,219,254,0.96)",
      noteColor: "rgba(226,232,240,0.88)",
      shadowColor: "rgba(0,0,0,0.28)",
    };
  }

  return {
    panelFill: "rgba(15, 23, 42, 0.36)",
    panelStroke: "rgba(255,255,255,0.16)",
    bodyFill: "rgba(255,255,255,0.035)",
    bodyStroke: "rgba(255,255,255,0.06)",
    titleColor: "rgba(255,255,255,0.98)",
    metaColor: "rgba(226,232,240,0.92)",
    softColor: "rgba(191,219,254,0.95)",
    noteColor: "rgba(203,213,225,0.88)",
    shadowColor: "rgba(0,0,0,0.18)",
  };
}

type WatermarkLayout = {
  cardWidth: number;
  cardHeight: number;
  titleFontSize: number;
  metaFontSize: number;
  bodyFontSize: number;
  titleLineHeight: number;
  metaLineHeight: number;
  bodyLineHeight: number;
  bodyLines: string[];
  bodyColumns: string[][];
  twoColumn: boolean;
  headerHeight: number;
  bodyTopOffset: number;
  contentWidth: number;
};

function resolveWatermarkPosition(
  requested: WatermarkPosition,
  imageWidth: number,
  imageHeight: number
): ResolvedWatermarkPosition {
  if (requested !== "auto") {
    return requested as ResolvedWatermarkPosition;
  }

  const isPortrait = imageHeight > imageWidth * 1.08;
  if (isPortrait) return "bottom-right";
  return "top-right";
}

function getWatermarkRect(
  canvasWidth: number,
  canvasHeight: number,
  cardWidth: number,
  cardHeight: number,
  position: ResolvedWatermarkPosition
) {
  const margin = Math.max(16, Math.round(Math.min(canvasWidth, canvasHeight) * 0.025));

  if (position === "top-left") return { x: margin, y: margin };
  if (position === "top-right") return { x: canvasWidth - cardWidth - margin, y: margin };
  if (position === "bottom-left") return { x: margin, y: canvasHeight - cardHeight - margin };
  return {
    x: canvasWidth - cardWidth - margin,
    y: canvasHeight - cardHeight - margin,
  };
}

function splitIntoTwoColumns(lines: string[]) {
  const half = Math.ceil(lines.length / 2);
  return [lines.slice(0, half), lines.slice(half)];
}

function createWatermarkLayout(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  trade: Trade,
  mode: WatermarkMode
): WatermarkLayout {
  const isCompact = mode === "compact";
  const cardWidth = Math.min(
    Math.round(canvasWidth * (isCompact ? 0.36 : 0.46)),
    isCompact ? 500 : 700
  );
  const maxCardHeight = Math.min(
    Math.round(canvasHeight * (isCompact ? 0.42 : 0.64)),
    isCompact ? 320 : 560
  );
  const minCardHeight = isCompact ? 130 : 180;

  const titleFontSize = Math.max(12, Math.round(canvasWidth * (isCompact ? 0.0102 : 0.0108)));
  const metaFontSize = Math.max(10, Math.round(canvasWidth * (isCompact ? 0.0082 : 0.0088)));

  const bodyFontCandidates = isCompact
    ? [
      Math.max(11, Math.round(canvasWidth * 0.0072)),
      Math.max(10, Math.round(canvasWidth * 0.0066)),
      10,
      9,
    ]
    : [
      Math.max(13, Math.round(canvasWidth * 0.0084)),
      Math.max(12, Math.round(canvasWidth * 0.0078)),
      Math.max(11, Math.round(canvasWidth * 0.0072)),
      10,
      9,
    ];

  const paddingX = 18;
  const paddingTop = 16;
  const paddingBottom = 16;
  const rightInset = 16;
  const accentSpace = 16;
  const contentWidth = cardWidth - paddingX - rightInset - accentSpace;

  const titleLineHeight = Math.round(titleFontSize * 1.35);
  const metaLineHeight = Math.round(metaFontSize * 1.45);
  const watermarkText = buildWatermarkText(trade);

  let chosenBodyFontSize = bodyFontCandidates[bodyFontCandidates.length - 1];
  let chosenBodyLineHeight = Math.round(chosenBodyFontSize * 1.6);
  let chosenLines: string[] = [];
  let chosenTwoColumn = false;
  let chosenColumns: string[][] = [];

  for (const size of bodyFontCandidates) {
    ctx.font = `500 ${size}px Vazirmatn, Tahoma, sans-serif`;

    const singleColumnLines = watermarkText
      ? wrapCanvasText(ctx, watermarkText, contentWidth)
      : [];
    const bodyLineHeight = Math.round(size * 1.6);

    const executionBlockHeight = trade.executionScore !== "" ? metaLineHeight : 0;
    const headerHeight =
      paddingTop +
      titleLineHeight +
      8 +
      metaLineHeight +
      8 +
      metaLineHeight +
      8 +
      metaLineHeight +
      (trade.executionScore !== "" ? 8 + executionBlockHeight : 0) +
      14;

    const availableBodyHeight = maxCardHeight - headerHeight - paddingBottom;
    const neededSingleHeight = singleColumnLines.length * bodyLineHeight;

    if (neededSingleHeight <= availableBodyHeight) {
      const finalHeight = Math.max(
        minCardHeight,
        headerHeight + neededSingleHeight + paddingBottom
      );

      return {
        cardWidth,
        cardHeight: finalHeight,
        titleFontSize,
        metaFontSize,
        bodyFontSize: size,
        titleLineHeight,
        metaLineHeight,
        bodyLineHeight,
        bodyLines: singleColumnLines,
        bodyColumns: [singleColumnLines],
        twoColumn: false,
        headerHeight,
        bodyTopOffset: headerHeight,
        contentWidth,
      };
    }

    if (!isCompact) {
      const gap = 16;
      const colWidth = Math.floor((contentWidth - gap) / 2);
      const twoColLines = watermarkText ? wrapCanvasText(ctx, watermarkText, colWidth) : [];
      const columns = splitIntoTwoColumns(twoColLines);
      const longestCol = Math.max(columns[0].length, columns[1].length);
      const neededTwoColHeight = longestCol * bodyLineHeight;

      if (neededTwoColHeight <= availableBodyHeight && columns[1].length > 0) {
        const finalHeight = Math.max(
          minCardHeight,
          headerHeight + neededTwoColHeight + paddingBottom
        );

        return {
          cardWidth,
          cardHeight: finalHeight,
          titleFontSize,
          metaFontSize,
          bodyFontSize: size,
          titleLineHeight,
          metaLineHeight,
          bodyLineHeight,
          bodyLines: twoColLines,
          bodyColumns: columns,
          twoColumn: true,
          headerHeight,
          bodyTopOffset: headerHeight,
          contentWidth,
        };
      }

      chosenTwoColumn = true;
      chosenColumns = columns;
      chosenLines = twoColLines;
    } else {
      chosenTwoColumn = false;
      chosenLines = singleColumnLines;
      chosenColumns = [singleColumnLines];
    }

    chosenBodyFontSize = size;
    chosenBodyLineHeight = bodyLineHeight;
  }

  ctx.font = `500 ${chosenBodyFontSize}px Vazirmatn, Tahoma, sans-serif`;

  const executionBlockHeight = trade.executionScore !== "" ? metaLineHeight : 0;
  const headerHeight =
    paddingTop +
    titleLineHeight +
    8 +
    metaLineHeight +
    8 +
    metaLineHeight +
    8 +
    metaLineHeight +
    (trade.executionScore !== "" ? 8 + executionBlockHeight : 0) +
    14;

  const availableBodyHeight = maxCardHeight - headerHeight - paddingBottom;
  const maxBodyLines = Math.max(1, Math.floor(availableBodyHeight / chosenBodyLineHeight));

  if (chosenTwoColumn && !isCompact) {
    const gap = 16;
    const colWidth = Math.floor((contentWidth - gap) / 2);
    const flattened = ellipsizeLines(
      ctx,
      chosenLines,
      maxBodyLines * 2,
      colWidth
    );
    const columns = splitIntoTwoColumns(flattened);

    return {
      cardWidth,
      cardHeight: maxCardHeight,
      titleFontSize,
      metaFontSize,
      bodyFontSize: chosenBodyFontSize,
      titleLineHeight,
      metaLineHeight,
      bodyLineHeight: chosenBodyLineHeight,
      bodyLines: flattened,
      bodyColumns: columns,
      twoColumn: columns[1].length > 0,
      headerHeight,
      bodyTopOffset: headerHeight,
      contentWidth,
    };
  }

  const fittedLines = ellipsizeLines(ctx, chosenLines, maxBodyLines, contentWidth);

  return {
    cardWidth,
    cardHeight: maxCardHeight,
    titleFontSize,
    metaFontSize,
    bodyFontSize: chosenBodyFontSize,
    titleLineHeight,
    metaLineHeight,
    bodyLineHeight: chosenBodyLineHeight,
    bodyLines: fittedLines,
    bodyColumns: [fittedLines],
    twoColumn: false,
    headerHeight,
    bodyTopOffset: headerHeight,
    contentWidth,
  };
}

function drawTextLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  regularColor: string
) {
  let y = startY;
  for (const line of lines) {
    const isLabel =
      line.startsWith("اشتباه:") ||
      line.startsWith("یادداشت:") ||
      line.startsWith("تگ‌ها:");
    ctx.fillStyle = isLabel ? "rgba(255,255,255,0.94)" : regularColor;

    if (line === "") {
      y += Math.round(lineHeight * 0.65);
    } else {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
  }
}

async function buildWatermarkedImageDataUrl(
  trade: Trade,
  image: TradeImage,
  requestedPosition: WatermarkPosition,
  mode: WatermarkMode
) {
  await loadFontForCanvas();
  const img = await loadImage(image.dataUrl);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";

  const theme = getAdaptiveTheme(ctx, canvas.width, canvas.height);
  const layout = createWatermarkLayout(ctx, canvas.width, canvas.height, trade, mode);
  const resolvedPosition = resolveWatermarkPosition(
    requestedPosition,
    canvas.width,
    canvas.height
  );

  const { x, y } = getWatermarkRect(
    canvas.width,
    canvas.height,
    layout.cardWidth,
    layout.cardHeight,
    resolvedPosition
  );

  ctx.save();
  ctx.shadowColor = theme.shadowColor;
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = theme.panelFill;
  fillRoundedRect(ctx, x, y, layout.cardWidth, layout.cardHeight, 22);
  ctx.restore();

  ctx.strokeStyle = theme.panelStroke;
  ctx.lineWidth = 1;
  strokeRoundedRect(ctx, x, y, layout.cardWidth, layout.cardHeight, 22);

  const accent = getAccentColor(trade.result);
  ctx.fillStyle = accent;
  fillRoundedRect(ctx, x + 10, y + 10, 4, layout.cardHeight - 20, 999);

  const bodyBoxX = x + 18;
  const bodyBoxY = y + layout.bodyTopOffset - 4;
  const bodyBoxWidth = layout.cardWidth - 34;
  const bodyBoxHeight = layout.cardHeight - layout.bodyTopOffset - 12;

  if (layout.bodyLines.length > 0) {
    ctx.fillStyle = theme.bodyFill;
    fillRoundedRect(ctx, bodyBoxX, bodyBoxY, bodyBoxWidth, bodyBoxHeight, 14);
    ctx.strokeStyle = theme.bodyStroke;
    ctx.lineWidth = 1;
    strokeRoundedRect(ctx, bodyBoxX, bodyBoxY, bodyBoxWidth, bodyBoxHeight, 14);
  }

  const right = x + layout.cardWidth - 14;
  let currentY = y + 16 + layout.titleFontSize;

  ctx.font = `700 ${layout.titleFontSize}px Vazirmatn, Tahoma, sans-serif`;
  ctx.fillStyle = theme.titleColor;
  ctx.fillText(`${trade.symbol} | ${getDirectionLabel(trade.direction)}`, right, currentY);

  currentY += layout.metaLineHeight + 4;
  ctx.font = `500 ${layout.metaFontSize}px Vazirmatn, Tahoma, sans-serif`;
  ctx.fillStyle = theme.metaColor;
  ctx.fillText(
    `${getResultLabel(trade.result)} | ${formatTradeDate(trade.tradeDate)}`,
    right,
    currentY
  );

  currentY += layout.metaLineHeight;
  ctx.fillStyle = theme.softColor;
  ctx.fillText(
    `ریسک: ${trade.riskAmount === "" ? "-" : `$${trade.riskAmount}`}`,
    right,
    currentY
  );

  currentY += layout.metaLineHeight;
  ctx.fillStyle = theme.metaColor;
  ctx.fillText(`سود/ضرر: ${trade.pnl === "" ? "-" : `$${trade.pnl}`}`, right, currentY);

  if (trade.executionScore !== "") {
    currentY += layout.metaLineHeight;
    ctx.fillStyle = "rgba(196,181,253,0.96)";
    ctx.fillText(`امتیاز اجرا: ${trade.executionScore}`, right, currentY);
  }

  if (layout.bodyLines.length > 0) {
    ctx.font = `500 ${layout.bodyFontSize}px Vazirmatn, Tahoma, sans-serif`;

    if (layout.twoColumn) {
      const gap = 16;
      const colWidth = Math.floor((layout.contentWidth - gap) / 2);
      const rightColRight = x + layout.cardWidth - 18;
      const leftColRight = rightColRight - colWidth - gap;
      const startY = bodyBoxY + 18 + layout.bodyFontSize;

      drawTextLines(
        ctx,
        layout.bodyColumns[0] ?? [],
        rightColRight,
        startY,
        layout.bodyLineHeight,
        theme.noteColor
      );
      drawTextLines(
        ctx,
        layout.bodyColumns[1] ?? [],
        leftColRight,
        startY,
        layout.bodyLineHeight,
        theme.noteColor
      );
    } else {
      const textRight = x + layout.cardWidth - 18;
      const bodyY = bodyBoxY + 18 + layout.bodyFontSize;

      drawTextLines(
        ctx,
        layout.bodyColumns[0] ?? [],
        textRight,
        bodyY,
        layout.bodyLineHeight,
        theme.noteColor
      );
    }
  }

  return canvas.toDataURL("image/png");
}

async function downloadWatermarkedImage(
  trade: Trade,
  image: TradeImage,
  requestedPosition: WatermarkPosition,
  mode: WatermarkMode
) {
  const url = await buildWatermarkedImageDataUrl(trade, image, requestedPosition, mode);
  if (!url) return;

  const a = document.createElement("a");
  a.href = url;
  a.download = `${trade.symbol}-${trade.result}-${image.name.replace(/\.[^.]+$/, "")}-marked.png`;
  a.click();
}

async function downloadAllWatermarkedImages(
  trade: Trade,
  requestedPosition: WatermarkPosition,
  mode: WatermarkMode
) {
  for (const image of trade.images) {
    await downloadWatermarkedImage(trade, image, requestedPosition, mode);
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
}

async function filesToImages(fileList: FileList): Promise<TradeImage[]> {
  const files = Array.from(fileList);

  return Promise.all(
    files.map(
      (file) =>
        new Promise<TradeImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: crypto.randomUUID(),
              name: file.name,
              dataUrl: String(reader.result),
            });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

function Field({
  label,
  children,
  helper,
  className,
}: {
  label: string;
  children: ReactNode;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass()}>{label}</label>
      {children}
      {helper ? <div className={helperClass()}>{helper}</div> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-rose-300"
        : tone === "info"
          ? "text-sky-300"
          : "text-white";

  return (
    <div className={statCardClass()}>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className={cn("mt-2 text-xl font-semibold", toneClass)}>{value}</div>
    </div>
  );
}

function Toast({
  text,
  type,
  onClose,
}: {
  text: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl",
        type === "success"
          ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100"
          : "border-rose-400/20 bg-rose-500/15 text-rose-100"
      )}
    >
      <div className="flex items-center gap-2">
        {type === "success" ? <Check size={16} /> : <X size={16} />}
        {text}
      </div>
    </div>
  );
}

function ImageModal({
  src,
  title,
  onClose,
}: {
  src: string;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full max-w-6xl items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full rounded-[28px] border border-white/10 bg-slate-950/90 p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <div className="truncate text-sm text-white">{title}</div>
            <button onClick={onClose} className={secondaryButton()}>
              <X size={16} />
              بستن
            </button>
          </div>
          <img
            src={src}
            alt={title}
            className="max-h-[78vh] w-full rounded-2xl object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export function JournalApp() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [draft, setDraft] = useState<Trade>(emptyTrade());
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<Trade["result"] | "ALL">("ALL");
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [watermarkPosition, setWatermarkPosition] =
    useState<WatermarkPosition>("auto");
  const [watermarkMode, setWatermarkMode] = useState<WatermarkMode>("detailed");
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);

  const tradeCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTrades(loadTrades());
  }, []);

  useEffect(() => {
    saveTrades(trades);
  }, [trades]);

  const uniqueSymbols = useMemo(() => {
    return Array.from(new Set(trades.map((t) => t.symbol.trim()).filter(Boolean))).sort();
  }, [trades]);

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.result !== "OPEN");
    const wins = closed.filter((t) => t.result === "WIN");
    const losses = closed.filter((t) => t.result === "LOSS");
    const grossProfit = wins.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const grossLoss = losses.reduce((sum, t) => sum + Math.abs(Number(t.pnl || 0)), 0);
    const net = closed.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const winRate = closed.length ? ((wins.length / closed.length) * 100).toFixed(1) : "0.0";
    const pf = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : "0.00";

    return {
      total: trades.length,
      closed: closed.length,
      winRate,
      net: net.toFixed(2),
      pf,
    };
  }, [trades]);

  const filteredTrades = useMemo(() => {
    const q = search.trim().toLowerCase();

    return trades.filter((trade) => {
      const textMatch =
        !q ||
        [
          trade.symbol,
          trade.direction,
          trade.result,
          trade.tradeDate,
          String(trade.riskAmount),
          String(trade.pnl),
          String(trade.executionScore),
          trade.mistake,
          trade.notes,
          ...(trade.tags || []),
        ].some((value) => value.toLowerCase().includes(q));

      const resultMatch = resultFilter === "ALL" || trade.result === resultFilter;
      const symbolMatch = symbolFilter === "ALL" || trade.symbol === symbolFilter;

      const tradeTime = new Date(trade.tradeDate).getTime();
      const fromMatch = !fromDate || tradeTime >= new Date(fromDate).getTime();
      const toMatch = !toDate || tradeTime <= new Date(`${toDate}T23:59`).getTime();

      return textMatch && resultMatch && symbolMatch && fromMatch && toMatch;
    });
  }, [trades, search, resultFilter, symbolFilter, fromDate, toDate]);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type });
  }

  function updateDraft<K extends keyof Trade>(key: K, value: Trade[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function addImagesFromFiles(files: FileList | File[] | null) {
    if (!files || ("length" in files && files.length === 0)) return;
    const normalized = Array.from(files as ArrayLike<File>);
    const dt = new DataTransfer();
    normalized.forEach((file) => dt.items.add(file));
    const images = await filesToImages(dt.files);
    setDraft((prev) => ({ ...prev, images: [...prev.images, ...images] }));
    showToast("تصاویر اضافه شدند");
  }

  async function handleImagesChange(e: ChangeEvent<HTMLInputElement>) {
    await addImagesFromFiles(e.target.files);
    e.target.value = "";
  }

  function resetForm() {
    setDraft(emptyTrade());
    setEditingTradeId(null);
  }

  function validateDraft() {
    if (!draft.symbol.trim()) {
      showToast("نماد را وارد کن", "error");
      return false;
    }

    return true;
  }

  function addOrUpdateTrade() {
    if (!validateDraft()) return;

    if (editingTradeId) {
      setTrades((prev) =>
        prev.map((trade) => (trade.id === editingTradeId ? draft : trade))
      );
      resetForm();
      showToast("ترید با موفقیت ویرایش شد");
      return;
    }

    setTrades((prev) => [draft, ...prev]);
    setDraft(emptyTrade());
    showToast("ترید جدید ذخیره شد");
  }

  function deleteTrade(id: string) {
    setTrades((prev) => prev.filter((trade) => trade.id !== id));
    if (editingTradeId === id) resetForm();
    showToast("ترید حذف شد");
  }

  function editTrade(trade: Trade) {
    setDraft({
      ...trade,
      images: [...trade.images],
      tags: [...trade.tags],
    });
    setEditingTradeId(trade.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeDraftImage(id: string) {
    setDraft((prev) => ({
      ...prev,
      images: prev.images.filter((image) => image.id !== id),
    }));
    showToast("تصویر حذف شد");
  }

  function toggleTag(tag: TradeTag) {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((item) => item !== tag)
        : [...prev.tags, tag],
    }));
  }

  function exportPrintableJournal() {
    const html = buildPrintableHtml(trades);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }

  async function exportTradePng(id: string) {
    const node = tradeCardRefs.current[id];
    if (!node) return;
    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `trade-${id}.png`;
    a.click();
    showToast("کارت ترید دانلود شد");
  }

  async function handleRestoreBackup(file: File) {
    try {
      const restored = await restoreJsonBackup(file);
      setTrades(restored);
      showToast("بکاپ با موفقیت بازیابی شد");
    } catch {
      showToast("فایل بکاپ معتبر نیست", "error");
    }
  }

  function clearFilters() {
    setSearch("");
    setResultFilter("ALL");
    setSymbolFilter("ALL");
    setFromDate("");
    setToDate("");
  }

  function onDropZoneDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function onDropZoneLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }

  async function onDropZoneDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    await addImagesFromFiles(e.dataTransfer.files);
  }

  return (
    <>
      <main className="mx-auto min-h-screen max-w-7xl p-4 md:p-6">
        <section className={cn("mb-6 p-5 md:p-6", shellPanel())}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[11px] text-sky-200">
                <Check size={12} />
                نسخه نهایی Production Journal
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                ژورنال معاملاتی حرفه‌ای
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                ثبت، تحلیل، و خروجی‌گیری از تریدها با فرم‌های حرفه‌ای‌تر، واترمارک
                هوشمند، فیلتر پیشرفته و مدیریت کامل داده‌ها
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadJsonBackup(trades)}
                className={secondaryButton()}
              >
                <FileJson size={16} />
                دانلود بکاپ JSON
              </button>

              <button
                onClick={() => restoreInputRef.current?.click()}
                className={secondaryButton()}
              >
                <RotateCcw size={16} />
                بازیابی بکاپ
              </button>

              <button onClick={exportPrintableJournal} className={primaryButton()}>
                <Printer size={16} />
                خروجی چاپی
              </button>

              <input
                ref={restoreInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleRestoreBackup(file);
                  e.currentTarget.value = "";
                }}
              />
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="کل تریدها" value={stats.total} />
          <StatCard label="ترید بسته" value={stats.closed} />
          <StatCard label="وین‌ریت" value={`${stats.winRate}%`} tone="success" />
          <StatCard label="سود خالص" value={`$${stats.net}`} tone="info" />
          <StatCard label="Profit Factor" value={stats.pf} />
        </section>



        <section className={cn("mb-6 overflow-hidden p-5 md:p-6", shellPanel())}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {editingTradeId ? "ویرایش ترید" : "ثبت ترید جدید"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                فرم حرفه‌ای‌تر با فیلدهای زیباتر، تگ‌گذاری و آپلود پیشرفته تصاویر
              </p>
            </div>

            {editingTradeId ? (
              <button onClick={resetForm} className={secondaryButton()}>
                <X size={16} />
                لغو ویرایش
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="تاریخ و زمان">
              <input
                className={glassInput()}
                type="datetime-local"
                value={draft.tradeDate}
                onChange={(e) => updateDraft("tradeDate", e.target.value)}
              />
            </Field>

            <Field label="نماد" helper="مثلاً XAUUSD یا NAS100">
              <input
                className={glassInput()}
                value={draft.symbol}
                onChange={(e) => updateDraft("symbol", e.target.value.toUpperCase())}
                placeholder="XAUUSD"
              />
            </Field>

            <Field label="جهت معامله">
              <select
                className={glassSelect()}
                value={draft.direction}
                onChange={(e) => updateDraft("direction", e.target.value as Trade["direction"])}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </Field>

            <Field label="نتیجه معامله">
              <select
                className={glassSelect()}
                value={draft.result}
                onChange={(e) => updateDraft("result", e.target.value as Trade["result"])}
              >
                <option value="WIN">WIN</option>
                <option value="LOSS">LOSS</option>
                <option value="BE">BE</option>
                <option value="OPEN">OPEN</option>
              </select>
            </Field>

            <Field label="ریسک دلاری">
              <input
                className={glassInput()}
                type="number"
                step="0.01"
                value={draft.riskAmount}
                onChange={(e) =>
                  updateDraft("riskAmount", e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="100"
              />
            </Field>

            <Field label="سود / ضرر">
              <input
                className={glassInput()}
                type="number"
                step="0.01"
                value={draft.pnl}
                onChange={(e) =>
                  updateDraft("pnl", e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="250"
              />
            </Field>

            <Field label="امتیاز اجرا" helper="عددی بین 0 تا 10">
              <input
                className={glassInput()}
                type="number"
                min="0"
                max="10"
                value={draft.executionScore}
                onChange={(e) =>
                  updateDraft(
                    "executionScore",
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                placeholder="8"
              />
            </Field>

            <Field label="محل واترمارک">
              <select
                className={glassSelect()}
                value={watermarkPosition}
                onChange={(e) => setWatermarkPosition(e.target.value as WatermarkPosition)}
              >
                <option value="auto">هوشمند</option>
                <option value="top-left">بالا چپ</option>
                <option value="top-right">بالا راست</option>
                <option value="bottom-left">پایین چپ</option>
                <option value="bottom-right">پایین راست</option>
              </select>
            </Field>

            <Field label="حالت واترمارک">
              <select
                className={glassSelect()}
                value={watermarkMode}
                onChange={(e) => setWatermarkMode(e.target.value as WatermarkMode)}
              >
                <option value="compact">Compact</option>
                <option value="detailed">Detailed</option>
              </select>
            </Field>

            <Field label="اشتباه معامله" className="xl:col-span-2">
              <textarea
                className={glassTextarea()}
                rows={4}
                value={draft.mistake}
                onChange={(e) => updateDraft("mistake", e.target.value)}
                placeholder="اشتباهات اجرایی، ذهنی یا پلن..."
              />
            </Field>

            <Field label="یادداشت کامل" className="xl:col-span-3">
              <textarea
                className={cn(glassTextarea(), "min-h-[150px]")}
                rows={6}
                value={draft.notes}
                onChange={(e) => updateDraft("notes", e.target.value)}
                placeholder="تحلیل قبل ورود، مدیریت، خروج، احساسات، نتیجه‌گیری..."
              />
            </Field>

            <Field
              label="تگ‌ها"
              className="xl:col-span-4"
              helper="برای دسته‌بندی بهتر تریدها"
            >
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => {
                  const active = draft.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={tagBadgeClass(active)}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field
              label="آپلود تصویر"
              className="xl:col-span-4"
              helper="می‌توانی چند تصویر همزمان اضافه کنی یا drag & drop انجام بدهی"
            >
              <div
                onDragOver={onDropZoneDragOver}
                onDragLeave={onDropZoneLeave}
                onDrop={onDropZoneDrop}
                className={cn(
                  "rounded-[24px] border-2 border-dashed p-6 text-center transition",
                  dragActive
                    ? "border-sky-400/70 bg-sky-500/10"
                    : "border-white/10 bg-white/[0.03]"
                )}
              >
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                  <UploadCloud size={24} />
                </div>

                <div className="text-sm text-white">تصاویر ترید را اینجا رها کن</div>
                <div className="mt-1 text-xs text-slate-400">
                  یا از دکمه زیر برای انتخاب فایل استفاده کن
                </div>

                <div className="mt-4">
                  <label className={primaryButton()}>
                    <UploadCloud size={16} />
                    انتخاب تصویر
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImagesChange}
                    />
                  </label>
                </div>
              </div>
            </Field>
          </div>

          {draft.images.length > 0 ? (
            <div className="mt-5">
              <div className="mb-3 text-sm font-medium text-white">پیش‌نمایش تصاویر</div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {draft.images.map((image) => (
                  <div
                    key={image.id}
                    className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                  >
                    <div className="relative">
                      <img
                        src={image.dataUrl}
                        alt={image.name}
                        className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <button
                        onClick={() =>
                          setModalImage({ src: image.dataUrl, title: image.name })
                        }
                        className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-xl bg-black/45 px-2.5 py-1.5 text-[11px] text-white backdrop-blur"
                      >
                        <Eye size={13} />
                        مشاهده
                      </button>
                    </div>

                    <div className="p-3">
                      <div className="truncate text-xs text-slate-300">{image.name}</div>
                      <button
                        onClick={() => removeDraftImage(image.id)}
                        className={cn(dangerButton(), "mt-3 w-full rounded-xl py-2 text-xs")}
                      >
                        <Trash2 size={14} />
                        حذف تصویر
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={addOrUpdateTrade} className={primaryButton()}>
              {editingTradeId ? <Save size={16} /> : <Plus size={16} />}
              {editingTradeId ? "ذخیره تغییرات" : "ثبت ترید"}
            </button>

            <button onClick={resetForm} className={secondaryButton()}>
              <RotateCcw size={16} />
              ریست فرم
            </button>
          </div>
        </section>
        <section className={cn("mb-6 p-5", subtlePanel())}>
          <div className="mb-4 flex items-center gap-2 text-white">
            <Filter size={16} />
            <h2 className="text-sm font-medium">جستجو و فیلتر پیشرفته</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Field label="جستجو">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  className={cn(glassInput(), "pr-11")}
                  placeholder="مثلاً XAUUSD یا mistake..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </Field>

            <Field label="فیلتر نتیجه">
              <select
                className={glassSelect()}
                value={resultFilter}
                onChange={(e) =>
                  setResultFilter(e.target.value as Trade["result"] | "ALL")
                }
              >
                <option value="ALL">همه</option>
                <option value="WIN">WIN</option>
                <option value="LOSS">LOSS</option>
                <option value="BE">BE</option>
                <option value="OPEN">OPEN</option>
              </select>
            </Field>

            <Field label="فیلتر نماد">
              <select
                className={glassSelect()}
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
              >
                <option value="ALL">همه</option>
                {uniqueSymbols.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="از تاریخ">
              <input
                className={glassInput()}
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </Field>

            <Field label="تا تاریخ">
              <input
                className={glassInput()}
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={clearFilters} className={secondaryButton()}>
              <RotateCcw size={16} />
              پاک کردن فیلترها
            </button>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
              {filteredTrades.length} مورد پیدا شد
            </div>
          </div>
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">لیست تریدها</h2>
              <p className="mt-1 text-xs text-slate-400">
                مدیریت، ویرایش، خروجی کارت و دانلود تصاویر واترمارک‌شده
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400">
              {filteredTrades.length} ترید
            </div>
          </div>

          <div className="grid gap-5">
            {filteredTrades.map((trade) => (
              <article
                key={trade.id}
                ref={(node) => {
                  tradeCardRefs.current[trade.id] = node;
                }}
                className={cn("overflow-hidden p-5", shellPanel())}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {trade.symbol} - {getDirectionLabel(trade.direction)}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full border px-3 py-1 text-[11px]",
                          resultBadge(trade.result)
                        )}
                      >
                        {getResultLabel(trade.result)}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-400">
                      {formatTradeDate(trade.tradeDate)}
                    </div>

                    {trade.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {trade.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => editTrade(trade)}
                      className={cn(miniButton(), "border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]")}
                    >
                      <Pencil size={14} />
                      ویرایش
                    </button>

                    <button
                      onClick={() => exportTradePng(trade.id)}
                      className={cn(miniButton(), "border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]")}
                    >
                      <FileImage size={14} />
                      خروجی کارت
                    </button>

                    {trade.images.length > 0 ? (
                      <button
                        onClick={() =>
                          downloadAllWatermarkedImages(
                            trade,
                            watermarkPosition,
                            watermarkMode
                          )
                        }
                        className={cn(miniButton(), "bg-indigo-600 text-white hover:bg-indigo-500")}
                      >
                        <Download size={14} />
                        دانلود همه واترمارک‌ها
                      </button>
                    ) : null}

                    <button
                      onClick={() => deleteTrade(trade.id)}
                      className={cn(miniButton(), "bg-rose-600 text-white hover:bg-rose-500")}
                    >
                      <Trash2 size={14} />
                      حذف
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-[11px] text-slate-500">ریسک</div>
                    <div className="mt-1 text-sm text-white">{trade.riskAmount || "-"}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-[11px] text-slate-500">سود / ضرر</div>
                    <div className="mt-1 text-sm text-white">{trade.pnl || "-"}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-[11px] text-slate-500">امتیاز اجرا</div>
                    <div className="mt-1 text-sm text-white">{trade.executionScore || "-"}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-xs font-medium text-slate-300">اشتباه معامله</div>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-400">
                      {trade.mistake || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-xs font-medium text-slate-300">یادداشت کامل</div>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-400">
                      {trade.notes || "-"}
                    </div>
                  </div>
                </div>

                {trade.images.length > 0 ? (
                  <div className="mt-5">
                    <div className="mb-3 text-sm font-medium text-white">تصاویر</div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {trade.images.map((image) => (
                        <div
                          key={image.id}
                          className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]"
                        >
                          <div className="relative">
                            <img
                              src={image.dataUrl}
                              alt={image.name}
                              className="h-56 w-full object-cover"
                            />
                            <button
                              onClick={() =>
                                setModalImage({ src: image.dataUrl, title: image.name })
                              }
                              className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-xl bg-black/45 px-2.5 py-1.5 text-[11px] text-white backdrop-blur"
                            >
                              <Eye size={13} />
                              مشاهده
                            </button>
                          </div>

                          <div className="p-3">
                            <div className="truncate text-xs text-slate-300">{image.name}</div>

                            <button
                              onClick={() =>
                                downloadWatermarkedImage(
                                  trade,
                                  image,
                                  watermarkPosition,
                                  watermarkMode
                                )
                              }
                              className={cn(primaryButton(), "mt-3 w-full rounded-xl py-2 text-xs")}
                            >
                              <ImageDown size={14} />
                              دانلود واترمارک
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}

            {filteredTrades.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-400">
                  <Search size={22} />
                </div>
                <div className="text-sm text-white">هیچ تریدی پیدا نشد</div>
                <div className="mt-1 text-xs text-slate-500">
                  فیلترها را تغییر بده یا ترید جدید ثبت کن
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      {toast ? (
        <Toast
          text={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}

      {modalImage ? (
        <ImageModal
          src={modalImage.src}
          title={modalImage.title}
          onClose={() => setModalImage(null)}
        />
      ) : null}
    </>
  );
}
