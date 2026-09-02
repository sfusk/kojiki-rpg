// ゲームループ最小版（fieldモードのみ）。
// 内部解像度256x224（16x14タイル）を2倍描画し、512x448の物理canvasに表示する。
import { buildSprites } from './data/sprites.js';
import { createInput } from './engine/input.js';
import { createRenderer, drawField, TILE } from './engine/renderer.js';
import { tryStep } from './engine/movement.js';

const TWEEN_FRAMES = 8; // 1タイル移動にかけるフレーム数

// テスト用の9x7仮マップ（外周は壁#、中に木T・山Mを配置して当たり判定を確認できるようにする）
const testMap = {
  rows: [
    '#########',
    '#.......#',
    '#.M.....#',
    '#...T...#',
    '#.......#',
    '#.......#',
    '#########',
  ],
};

const npcs = [
  { name: 'elder', x: 5, y: 2, frame: 0 },
  { name: 'rabbit', x: 6, y: 4, frame: 0 },
];

function createHero(tx, ty) {
  return {
    tx, ty,
    px: tx * TILE, py: ty * TILE,
    dir: 'down',
    frame: 0,
    moving: false,
    tweenFrame: 0,
    fromPx: tx * TILE, fromPy: ty * TILE,
    targetTx: tx, targetTy: ty,
  };
}

function main() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(2, 2); // 内部解像度256x224 → 物理512x448

  const sprites = buildSprites();
  const input = createInput(window);
  const renderer = createRenderer(ctx, sprites);

  const state = {
    mode: 'field', // title/field/msg/menu/quiz/battle/ending のうち、この最小版はfieldのみ実装
    hero: createHero(1, 1),
    animTick: 0,
  };

  function updateField() {
    const hero = state.hero;
    state.animTick++;
    // NPCのアイドルアニメ（一定間隔でフレーム切替）
    if (state.animTick % 30 === 0) {
      for (const npc of npcs) npc.frame = npc.frame ? 0 : 1;
    }

    if (!hero.moving) {
      let dir = null;
      if (input.isDown('ArrowUp')) dir = 'up';
      else if (input.isDown('ArrowDown')) dir = 'down';
      else if (input.isDown('ArrowLeft')) dir = 'left';
      else if (input.isDown('ArrowRight')) dir = 'right';

      if (dir) {
        hero.dir = dir;
        const result = tryStep(testMap, { x: hero.tx, y: hero.ty, dir }, dir);
        if (result.moved) {
          hero.moving = true;
          hero.tweenFrame = 0;
          hero.fromPx = hero.px;
          hero.fromPy = hero.py;
          hero.targetTx = result.pos.x;
          hero.targetTy = result.pos.y;
        }
      } else {
        hero.frame = 0;
      }
    } else {
      hero.tweenFrame++;
      const t = Math.min(hero.tweenFrame / TWEEN_FRAMES, 1);
      const targetPx = hero.targetTx * TILE;
      const targetPy = hero.targetTy * TILE;
      hero.px = hero.fromPx + (targetPx - hero.fromPx) * t;
      hero.py = hero.fromPy + (targetPy - hero.fromPy) * t;
      // 歩行アニメ：8フレームの前半/後半で2フレーム交互
      hero.frame = hero.tweenFrame < TWEEN_FRAMES / 2 ? 0 : 1;

      if (hero.tweenFrame >= TWEEN_FRAMES) {
        hero.tx = hero.targetTx;
        hero.ty = hero.targetTy;
        hero.px = targetPx;
        hero.py = targetPy;
        hero.moving = false;
        hero.frame = 0;
      }
    }
  }

  function loop() {
    if (state.mode === 'field') {
      updateField();
      drawField(renderer, testMap, state, npcs);
    }
    // title/msg/menu/quiz/battle/ending は未実装（今後のタスクで追加）
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main();
