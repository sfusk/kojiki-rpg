// DQ風ウィンドウUI：黒地・白枠2pxのウィンドウ、メッセージ送り、縦選択肢。
// drawWindow/drawText/drawMessageBox/drawChoiceWindow はcanvas ctxに依存する描画関数。
// paginateText/moveCursor/create*/advance*等は状態計算のみを行う純粋関数（DOM非依存・テスト対象）。

export const FONT = "16px 'ＭＳ ゴシック', monospace";
const RADIUS = 6; // ウィンドウ角丸半径

// 黒地・白枠2px・角丸のウィンドウを描画する
export function drawWindow(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + RADIUS, y);
  ctx.lineTo(x + w - RADIUS, y);
  ctx.arcTo(x + w, y, x + w, y + RADIUS, RADIUS);
  ctx.lineTo(x + w, y + h - RADIUS);
  ctx.arcTo(x + w, y + h, x + w - RADIUS, y + h, RADIUS);
  ctx.lineTo(x + RADIUS, y + h);
  ctx.arcTo(x, y + h, x, y + h - RADIUS, RADIUS);
  ctx.lineTo(x, y + RADIUS);
  ctx.arcTo(x, y, x + RADIUS, y, RADIUS);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// 16pxモノスペース白文字でテキストを描画する
export function drawText(ctx, text, x, y) {
  ctx.save();
  ctx.font = FONT;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ── テキストのページング（純粋関数） ─────────────────────
// \n を明示改行として尊重しつつ、charsPerLine文字ごとに折り返し、
// linesPerPage行を1ページとして分割する。空文字でも最低1ページ（空行1つ）を返す。
export function paginateText(text, charsPerLine = 18, linesPerPage = 2) {
  const rawLines = String(text ?? '').split('\n');
  const lines = [];
  for (const raw of rawLines) {
    if (raw.length === 0) { lines.push(''); continue; }
    for (let i = 0; i < raw.length; i += charsPerLine) {
      lines.push(raw.slice(i, i + charsPerLine));
    }
  }
  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  return pages.length > 0 ? pages : [['']];
}

// ── MessageBox：2行ずつページ表示・▼点滅・Z送り ───────────
export function createMessageBox(text, opts = {}) {
  const charsPerLine = opts.charsPerLine ?? 18;
  const linesPerPage = opts.linesPerPage ?? 2;
  return {
    pages: paginateText(text, charsPerLine, linesPerPage),
    pageIndex: 0,
    blinkTick: 0,
  };
}

// Z送り：次ページがあれば進めてtrue、最終ページなら何もせずfalse（呼び出し側で閉じる/次へ進む）
export function advanceMessageBox(box) {
  if (box.pageIndex < box.pages.length - 1) {
    box.pageIndex += 1;
    return true;
  }
  return false;
}

export function isMessageBoxLastPage(box) {
  return box.pageIndex >= box.pages.length - 1;
}

// 毎フレーム呼ぶ点滅カウンタ更新（純粋関数：入力→出力のみ、副作用はboxへの書き戻しのみ）
export function tickMessageBox(box, cycle = 60) {
  box.blinkTick = (box.blinkTick + 1) % cycle;
}

// ▼を表示すべきタイミングかどうか（点滅の前半だけ表示）
export function isBlinkVisible(box, onFrames = 30) {
  return box.blinkTick < onFrames;
}

export function drawMessageBox(ctx, box, x, y, w, h) {
  drawWindow(ctx, x, y, w, h);
  const page = box.pages[box.pageIndex] || [''];
  page.forEach((line, i) => drawText(ctx, line, x + 12, y + 10 + i * 22));
  if (isBlinkVisible(box)) drawText(ctx, '▼', x + w - 24, y + h - 26);
}

// ── ChoiceWindow：縦選択肢・▶カーソル・上下移動 ───────────
// 上下移動のカーソル計算（ラップアラウンド）。純粋関数。
export function moveCursor(current, delta, count) {
  if (count <= 0) return 0;
  return ((current + delta) % count + count) % count;
}

export function createChoiceWindow(items) {
  return { items, cursor: 0 };
}

export function moveChoiceCursor(win, delta) {
  win.cursor = moveCursor(win.cursor, delta, win.items.length);
}

export function drawChoiceWindow(ctx, win, x, y, w, h, lineHeight = 22) {
  drawWindow(ctx, x, y, w, h);
  win.items.forEach((label, i) => {
    const ly = y + 10 + i * lineHeight;
    if (i === win.cursor) drawText(ctx, '▶', x + 8, ly);
    drawText(ctx, String(label), x + 28, ly);
  });
}
