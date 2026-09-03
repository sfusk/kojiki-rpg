// ワールドマップ（日本列島）の検証。
// 章の入口と、各章から戻ってくる位置が食い違うと海の上に出たり
// 戻った瞬間に同じ章へ再突入したりするため、対応関係を保証する。
import { describe, it, expect } from 'vitest';
import { WORLD } from '../js/data/world.js';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { canEnter, DIRS } from '../js/engine/movement.js';

function flatten(commands, out = []) {
  for (const cmd of commands || []) {
    out.push(cmd);
    if (cmd.then) flatten(cmd.then, out);
    if (cmd.else) flatten(cmd.else, out);
  }
  return out;
}

// ワールド上の「章の入口」座標を map の id で引けるようにする
const entrances = {};
for (const tr of WORLD.triggers) {
  const warp = flatten(tr.event).find((c) => c.warp);
  if (warp) entrances[warp.warp.map] = { x: tr.x, y: tr.y };
}

// 各章からワールドへ戻る座標
const returns = {};
for (const [id, chapter] of Object.entries(CHAPTERS)) {
  if (id === 'world') continue;
  for (const tr of chapter.triggers || []) {
    const warp = flatten(tr.event).find((c) => c.warp && c.warp.map === 'world');
    if (warp) returns[id] = warp.warp;
  }
}

const chapterIds = Object.keys(CHAPTERS).filter((id) => id !== 'world');

describe('ワールドマップ', () => {
  it('マップの各行が同じ幅である', () => {
    const widths = new Set(WORLD.map.rows.map((r) => r.length));
    expect(widths.size).toBe(1);
  });

  it('全8章の入口がある', () => {
    expect(Object.keys(entrances).sort()).toEqual(chapterIds.sort());
  });

  it('入口はすべて鳥居か洞窟の上にある（草原に隠れない）', () => {
    const bad = [];
    for (const [id, { x, y }] of Object.entries(entrances)) {
      const tile = WORLD.map.rows[y][x];
      if (tile !== 't' && tile !== 'c') bad.push(`${id}(${x},${y})='${tile}'`);
    }
    expect(bad).toEqual([]);
  });

  it('プレイヤーの初期位置とすべての入口へ歩いて行ける', () => {
    const start = WORLD.entry;
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const { dx, dy } of Object.values(DIRS)) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || !canEnter(WORLD.map, nx, ny)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    expect(canEnter(WORLD.map, start.x, start.y)).toBe(true);
    const unreachable = Object.entries(entrances)
      .filter(([, { x, y }]) => !seen.has(`${x},${y}`))
      .map(([id]) => id);
    expect(unreachable).toEqual([]);
  });

  it('各章から戻る位置が進入できる場所である', () => {
    const bad = [];
    for (const [id, w] of Object.entries(returns)) {
      if (!canEnter(WORLD.map, w.x, w.y)) bad.push(`${id} → (${w.x},${w.y})`);
    }
    expect(bad).toEqual([]);
  });

  it('島にある章を除き、戻る位置は陸地である（海上に放り出されない）', () => {
    // 第一章の淡路島だけは四方を海に囲まれた島なので、船で出る形になる
    const islandChapters = new Set(['ch1']);
    const onSea = [];
    for (const [id, w] of Object.entries(returns)) {
      if (islandChapters.has(id)) continue;
      if (WORLD.map.rows[w.y][w.x] === '~') onSea.push(`${id} → (${w.x},${w.y})`);
    }
    expect(onSea).toEqual([]);
  });

  // 陸だけを辿った連結成分（＝ひとつの島）を返す
  function islandAt(x, y) {
    const rows = WORLD.map.rows;
    const isLand = (px, py) => py >= 0 && py < rows.length
      && px >= 0 && px < rows[py].length && rows[py][px] !== '~';
    const seen = new Set([`${x},${y}`]);
    const queue = [{ x, y }];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const { dx, dy } of Object.values(DIRS)) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || !isLand(nx, ny)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    return seen;
  }

  it('北海道・本州・四国・九州・淡路島がそれぞれ独立した島である', () => {
    // 各島の代表点（この座標が陸であることも同時に確かめる）
    const points = {
      北海道: { x: 24, y: 5 },
      本州: { x: 20, y: 20 },
      四国: { x: 12, y: 29 },
      九州: { x: 4, y: 30 },
      淡路島: entrances.ch1,
    };
    const islands = {};
    for (const [name, p] of Object.entries(points)) {
      expect(WORLD.map.rows[p.y][p.x], `${name}の代表点が海になっている`).not.toBe('~');
      islands[name] = islandAt(p.x, p.y);
    }
    // どの二つの島も陸続きになっていないこと
    const names = Object.keys(points);
    const merged = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = islands[names[i]];
        const b = islands[names[j]];
        if ([...a].some((k) => b.has(k))) merged.push(`${names[i]}と${names[j]}`);
      }
    }
    expect(merged).toEqual([]);
  });

  it('淡路島は本州や四国から切り離された小島である', () => {
    const rows = WORLD.map.rows;
    const isLand = (x, y) => y >= 0 && y < rows.length
      && x >= 0 && x < rows[y].length && rows[y][x] !== '~';
    // 第一章の入口を含む「陸だけを辿った」連結成分＝淡路島
    const start = entrances.ch1;
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const { dx, dy } of Object.values(DIRS)) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || !isLand(nx, ny)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    const totalLand = rows.join('').split('').filter((c) => c !== '~').length;
    // 島として成立する広さ（1マスでは点にしか見えない）でありながら、
    // 本州や四国と地続きになっていないこと
    expect(seen.size).toBeGreaterThanOrEqual(2);
    expect(seen.size).toBeLessThanOrEqual(4);
    expect(seen.size).toBeLessThan(totalLand / 10);
  });

  it('戻る位置は入口の隣であり、入口そのものではない（再突入しない）', () => {
    const bad = [];
    for (const id of chapterIds) {
      const e = entrances[id];
      const w = returns[id];
      if (!e || !w) { bad.push(`${id}: 入口か戻り先がない`); continue; }
      if (e.x === w.x && e.y === w.y) { bad.push(`${id}: 戻り先が入口と同じ`); continue; }
      const dist = Math.abs(e.x - w.x) + Math.abs(e.y - w.y);
      if (dist !== 1) bad.push(`${id}: 戻り先が入口の隣ではない（距離${dist}）`);
    }
    expect(bad).toEqual([]);
  });

  it('戻る位置が別の章の入口と重ならない', () => {
    const bad = [];
    for (const [id, w] of Object.entries(returns)) {
      for (const [otherId, e] of Object.entries(entrances)) {
        if (e.x === w.x && e.y === w.y) bad.push(`${id}の戻り先が${otherId}の入口と同じ`);
      }
    }
    expect(bad).toEqual([]);
  });
});
