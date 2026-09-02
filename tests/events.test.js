import { describe, it, expect } from 'vitest';
import { startEvent, stepEvent } from '../js/engine/events.js';
import { createState, setFlag, hasFlag, hasItem } from '../js/engine/flags.js';

describe('イベント解釈器', () => {
  it('msgで停止し、続きから再開できる', () => {
    const s = createState();
    const ev = startEvent([{ msg: 'こんにちは' }, { msg: 'さようなら' }]);
    expect(stepEvent(ev, s)).toEqual({ kind: 'msg', text: 'こんにちは' });
    expect(stepEvent(ev, s)).toEqual({ kind: 'msg', text: 'さようなら' });
    expect(stepEvent(ev, s)).toEqual({ kind: 'done' });
  });
  it('set/give/orb/codexは即時反映して継続する', () => {
    const s = createState();
    const ev = startEvent([{ set: 'met' }, { give: 'もものみ' }, { orb: true }, { codex: 'izanagi' }]);
    expect(stepEvent(ev, s)).toEqual({ kind: 'done' });
    expect(hasFlag(s, 'met')).toBe(true);
    expect(hasItem(s, 'もものみ')).toBe(true);
    expect(s.orbs).toBe(1);
    expect(s.codex).toContain('izanagi');
  });
  it('ifはフラグで分岐する', () => {
    const s = createState();
    const cmds = [{ if: 'met', then: [{ msg: 'また あったな' }], else: [{ msg: 'はじめまして' }] }];
    expect(stepEvent(startEvent(cmds), s).text).toBe('はじめまして');
    setFlag(s, 'met');
    expect(stepEvent(startEvent(cmds), s).text).toBe('また あったな');
  });
  it('warpでstate.posが変わる', () => {
    const s = createState();
    const ev = startEvent([{ warp: { map: 'ch1', x: 3, y: 4, dir: 'up' } }]);
    stepEvent(ev, s);
    expect(s.pos).toEqual({ map: 'ch1', x: 3, y: 4, dir: 'up' });
  });
  it('quiz/battleで停止して制御を返す', () => {
    const s = createState();
    const ev = startEvent([{ quiz: 'ch1' }, { battle: 'orochi' }]);
    expect(stepEvent(ev, s)).toEqual({ kind: 'quiz', id: 'ch1' });
    expect(stepEvent(ev, s)).toEqual({ kind: 'battle', id: 'orochi' });
  });
});
