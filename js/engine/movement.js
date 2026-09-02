import { PASSABLE } from '../data/tiles.js';
export const DIRS = { up:{dx:0,dy:-1}, down:{dx:0,dy:1}, left:{dx:-1,dy:0}, right:{dx:1,dy:0} };
export function canEnter(map, x, y) {
  if (y < 0 || y >= map.rows.length) return false;
  if (x < 0 || x >= map.rows[y].length) return false;
  return PASSABLE.has(map.rows[y][x]);
}
export function tryStep(map, pos, dir) {
  const { dx, dy } = DIRS[dir];
  const nx = pos.x + dx, ny = pos.y + dy;
  if (canEnter(map, nx, ny)) return { moved: true, pos: { x: nx, y: ny, dir } };
  return { moved: false, pos: { x: pos.x, y: pos.y, dir } };
}
