// フィールド描画。内部解像度256x224（16x14タイル）を前提とし、
// 呼び出し側（main.js）でctxを2倍スケールしてから使うこと。

export const TILE = 16;
export const VIEW_COLS = 16; // 画面に表示するタイル数（横）
export const VIEW_ROWS = 14; // 画面に表示するタイル数（縦）

// 水タイルのアニメーション切替間隔（フレーム数）。NPCの歩行アニメ（30フレーム毎）と揃える。
const WATER_ANIM_INTERVAL = 30;

export function createRenderer(ctx, sprites, tiles) {
  return { ctx, sprites, tiles };
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

// マップ文字→タイルcanvas名。水(~)のみ2フレームの波アニメを持つため animFrame で切り替える。
function tileSpriteName(ch, animFrame) {
  if (ch === '~') return `~_${animFrame}`;
  return ch;
}

// 未発動イベントの目印。ゆっくり明滅する光の粒を地面に置く。
// 一度その出来事を見届けると（フラグが立つと）呼び出し側が渡さなくなるので消える。
const SPARKLE_CYCLE = 72; // 明滅の周期（フレーム）

function drawSparkle(ctx, sx, sy, tick) {
  const phase = ((tick % SPARKLE_CYCLE) / SPARKLE_CYCLE) * Math.PI * 2;
  const pulse = 0.5 + 0.5 * Math.sin(phase);
  const cx = sx + TILE / 2;
  const cy = sy + TILE / 2;
  const arm = 2.5 + pulse * 2.5; // 光条の長さ
  ctx.save();
  ctx.globalAlpha = 0.5 + pulse * 0.5;
  ctx.fillStyle = '#ffe98a';
  ctx.fillRect(cx - 0.5, cy - arm, 1, arm * 2); // 縦の光条
  ctx.fillRect(cx - arm, cy - 0.5, arm * 2, 1); // 横の光条
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1, cy - 1, 2, 2); // 中心の粒
  ctx.restore();
}

export function drawField(r, map, state, npcs = [], sparkles = []) {
  const { ctx, sprites, tiles } = r;
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

  // 水タイルのアニメフレーム（0 or 1）。state.animTickがなければ静止扱い。
  const animFrame = Math.floor((state.animTick || 0) / WATER_ANIM_INTERVAL) % 2;

  for (let ty = startRow; ty < endRow; ty++) {
    const row = map.rows[ty];
    if (row === undefined) continue;
    for (let tx = startCol; tx < endCol; tx++) {
      const ch = row[tx];
      if (ch === undefined) continue;
      const sx = tx * TILE - camX;
      const sy = ty * TILE - camY;
      const tileImg = tiles && tiles.get(tileSpriteName(ch, animFrame));
      if (tileImg) {
        ctx.drawImage(tileImg, sx, sy, TILE, TILE);
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(sx, sy, TILE, TILE);
      }
    }
  }

  // 目印の光（地面の上、キャラクターの下に描く）
  for (const sp of sparkles) {
    drawSparkle(ctx, sp.x * TILE - camX, sp.y * TILE - camY, state.animTick || 0);
  }

  // NPC描画（タイル座標。スプライトは `${name}_${frame}`）
  // スプライト定義は32x32（精細ドット）だが、画面上のサイズはTILE(16)ユニットのまま。
  // imageSmoothingEnabled=false（main.js側で設定済み）によりニアレストネイバーで縮小され、
  // ドット密度だけが上がる。
  for (const npc of npcs) {
    const spr = sprites.get(`${npc.name}_${npc.frame || 0}`);
    if (!spr) continue;
    const sx = npc.x * TILE - camX;
    const sy = npc.y * TILE - camY;
    ctx.drawImage(spr, sx, sy, TILE, TILE);
  }

  // 主人公描画（連続ピクセル座標。スプライトは `hero_${dir}_${frame}`）
  const heroSpr = sprites.get(`hero_${hero.dir}_${hero.frame || 0}`);
  if (heroSpr) {
    const sx = hero.px - camX;
    const sy = hero.py - camY;
    ctx.drawImage(heroSpr, sx, sy, TILE, TILE);
  }
}
