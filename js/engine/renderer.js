// フィールド描画。内部解像度256x224（16x14タイル）を前提とし、
// 呼び出し側（main.js）でctxを2倍スケールしてから使うこと。
import { TILE_COLORS } from '../data/tiles.js';

export const TILE = 16;
export const VIEW_COLS = 16; // 画面に表示するタイル数（横）
export const VIEW_ROWS = 14; // 画面に表示するタイル数（縦）

export function createRenderer(ctx, sprites) {
  return { ctx, sprites };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// カメラ左上のワールド座標（px）を主人公中心・マップ端でclampして算出する
function computeCamera(map, heroPx, heroPy) {
  const mapW = map.rows[0].length * TILE;
  const mapH = map.rows.length * TILE;
  const viewW = VIEW_COLS * TILE;
  const viewH = VIEW_ROWS * TILE;
  const camX = clamp(heroPx - viewW / 2, 0, Math.max(0, mapW - viewW));
  const camY = clamp(heroPy - viewH / 2, 0, Math.max(0, mapH - viewH));
  return { camX, camY };
}

function drawTileAccent(ctx, ch, sx, sy) {
  // 山(M)は三角、木(T)は円で単純なアクセントを重ねる
  if (ch === 'M') {
    ctx.fillStyle = '#5a5248';
    ctx.beginPath();
    ctx.moveTo(sx + TILE / 2, sy + 2);
    ctx.lineTo(sx + TILE - 2, sy + TILE - 2);
    ctx.lineTo(sx + 2, sy + TILE - 2);
    ctx.closePath();
    ctx.fill();
  } else if (ch === 'T') {
    ctx.fillStyle = '#0f3a18';
    ctx.beginPath();
    ctx.arc(sx + TILE / 2, sy + TILE / 2, TILE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawField(r, map, state, npcs = []) {
  const { ctx, sprites } = r;
  const { hero } = state;

  const { camX, camY } = computeCamera(map, hero.px, hero.py);

  const viewW = VIEW_COLS * TILE;
  const viewH = VIEW_ROWS * TILE;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, viewW, viewH);

  // 表示範囲のタイルだけを描画
  const startCol = Math.floor(camX / TILE);
  const endCol = Math.ceil((camX + viewW) / TILE);
  const startRow = Math.floor(camY / TILE);
  const endRow = Math.ceil((camY + viewH) / TILE);

  for (let ty = startRow; ty < endRow; ty++) {
    const row = map.rows[ty];
    if (row === undefined) continue;
    for (let tx = startCol; tx < endCol; tx++) {
      const ch = row[tx];
      if (ch === undefined) continue;
      const sx = tx * TILE - camX;
      const sy = ty * TILE - camY;
      ctx.fillStyle = TILE_COLORS[ch] || '#000';
      ctx.fillRect(sx, sy, TILE, TILE);
      drawTileAccent(ctx, ch, sx, sy);
    }
  }

  // NPC描画（タイル座標。スプライトは `${name}_${frame}`）
  for (const npc of npcs) {
    const spr = sprites.get(`${npc.name}_${npc.frame || 0}`);
    if (!spr) continue;
    const sx = npc.x * TILE - camX;
    const sy = npc.y * TILE - camY;
    ctx.drawImage(spr, sx, sy);
  }

  // 主人公描画（連続ピクセル座標。スプライトは `hero_${dir}_${frame}`）
  const heroSpr = sprites.get(`hero_${hero.dir}_${hero.frame || 0}`);
  if (heroSpr) {
    const sx = hero.px - camX;
    const sy = hero.py - camY;
    ctx.drawImage(heroSpr, sx, sy);
  }
}
