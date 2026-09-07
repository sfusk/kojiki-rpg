import { it, expect } from 'vitest';
import { startEvent, stepEvent } from '../js/engine/events.js';
import { createState } from '../js/engine/flags.js';
import { createInput } from '../js/engine/input.js';
import * as illustrations from '../js/engine/illustration.js';

it('illustration pauses the event before flags and resumes at the following narration', () => {
  const state = createState();
  const event = startEvent([{ illustration: { src: 'scene.png', title: '国生み' } }, { msg: '島が生まれた' }, { set: 'born' }]);
  expect(stepEvent(event, state)).toEqual({ kind: 'illustration', scene: { src: 'scene.png', title: '国生み' } });
  expect(stepEvent(event, state)).toEqual({ kind: 'msg', text: '島が生まれた' });
  expect(state.flags.includes('born')).toBe(false);
  expect(stepEvent(event, state)).toEqual({ kind: 'done' });
  expect(state.flags.includes('born')).toBe(true);
});

function setup() {
  const input = createInput({ addEventListener() {}, removeEventListener() {} });
  const image = { naturalWidth: 1200, naturalHeight: 800 };
  return { input, image };
}
it('discards incoming keys and requires a new confirm, including touch', () => {
  const { input, image } = setup();
  input.press('z'); input.press('ArrowDown'); input.press('x');
  const scene = illustrations.createIllustration({ src: 'scene.png', title: '国生み' }, input, () => image);
  expect(illustrations.advanceIllustration(scene, input)).toBe(false);
  image.onload();
  expect(scene.status).toBe('ready');
  expect(illustrations.advanceIllustration(scene, input)).toBe(false);
  input.press('z'); input.press('ArrowDown');
  expect(illustrations.advanceIllustration(scene, input)).toBe(true);
  expect(input.consumeAdvance()).toBe(false);
  expect(input.consume('x')).toBe(false);
});
it('failed image automatically continues and a stalled load can be skipped', () => {
  const { input, image } = setup();
  const scene = illustrations.createIllustration({ src: 'missing.png' }, input, () => image);
  image.onerror();
  expect(illustrations.advanceIllustration(scene, input)).toBe(true);
  const stalled = illustrations.createIllustration({ src: 'slow.png' }, input, () => ({}));
  input.press('z');
  expect(illustrations.advanceIllustration(stalled, input)).toBe(true);
});
it('fits portrait and landscape art without stretching or cropping', () => {
  expect(illustrations.fitIllustration(1200, 800, 256, 160)).toEqual({ x: 8, y: 0, width: 240, height: 160 });
  expect(illustrations.fitIllustration(800, 1200, 240, 180)).toEqual({ x: 60, y: 0, width: 120, height: 180 });
});

import { CHAPTERS } from '../js/data/chapters/index.js';
const milestones = ['ch2_escape', 'ch3_iwato', 'ch4_slay', 'ch5_usagi', 'ch6_yuzuri', 'ch7_kourin', 'ch8_jinmu'];
function findBranch(commands, flag) {
  for (const command of commands) {
    if (command.if === flag && (command.else || []).some(item => item.set === flag)) return command;
    const found = findBranch([...(command.then || []), ...(command.else || [])], flag);
    if (found) return found;
  }
}
for (const flag of milestones) {
  it(`${flag}: displays chapter art and shows milestone art only before first completion`, () => {
    const chapter = CHAPTERS[flag.slice(0, 3)];
    expect(chapter.illustrations?.prologue?.src).toBe(`assets/illustrations/${flag.slice(0, 3)}.png`);
    expect(chapter.illustrations?.epilogue?.src).toBe(chapter.illustrations?.prologue?.src);
    const commands = [...(chapter.npcs || []), ...(chapter.triggers || [])].flatMap(item => item.event || []);
    const branch = findBranch(commands, flag);
    const state = createState();
    const event = startEvent([branch]);
    const seen = [];
    for (let result; (result = stepEvent(event, state)).kind !== 'done';) seen.push(result);
    expect(seen.filter(result => result.kind === 'illustration').map(result => result.scene.src)).toEqual([chapter.illustrations.prologue.src]);
    expect(state.flags.includes(flag)).toBe(true);
    const repeat = startEvent([branch]);
    for (let result; (result = stepEvent(repeat, state)).kind !== 'done';) expect(result.kind).not.toBe('illustration');
  });
}

it('title background falls back before loading, then renders art with a dark readable overlay', () => {
  const calls = [];
  const ctx = { fillStyle: '', imageSmoothingEnabled: false, save() {}, restore() {}, fillRect(...args) { calls.push([this.fillStyle, ...args]); }, drawImage(...args) { calls.push(['image', ...args.slice(1)]); } };
  illustrations.drawTitleBackground(ctx, { complete: false, naturalWidth: 0 });
  expect(calls).toEqual([['#000', 0, 0, 256, 224]]);
  calls.length = 0;
  illustrations.drawTitleBackground(ctx, { complete: true, naturalWidth: 1536, naturalHeight: 1024 });
  expect(calls[1]).toEqual(['image', -40, 0, 336, 224]);
  expect(calls[2]).toEqual(['rgba(0, 0, 0, 0.48)', 0, 0, 256, 224]);
});
