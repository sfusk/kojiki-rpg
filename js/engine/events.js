import { setFlag, hasFlag, addItem, removeItem, addOrb, addCodex } from './flags.js';

export function startEvent(commands) { return { queue: [...commands] }; }

export function stepEvent(ev, state) {
  while (ev.queue.length > 0) {
    const c = ev.queue.shift();
    if (c.if !== undefined) {
      const branch = hasFlag(state, c.if) ? c.then : (c.else || []);
      ev.queue.unshift(...branch); continue;
    }
    if (c.set) { setFlag(state, c.set); continue; }
    if (c.give) { addItem(state, c.give); continue; }
    if (c.take) { removeItem(state, c.take); continue; }
    if (c.orb) { addOrb(state); continue; }
    if (c.codex) { addCodex(state, c.codex); continue; }
    if (c.warp) { state.pos = { ...c.warp }; continue; }
    if (c.msg) return { kind: 'msg', text: c.msg };
    if (c.quiz) return { kind: 'quiz', id: c.quiz };
    if (c.battle) return { kind: 'battle', id: c.battle };
  }
  return { kind: 'done' };
}
