import { describe, it, expect } from 'vitest';
import { createInput } from '../js/engine/input.js';

// document/windowを使わないフェイクのイベントターゲット（addEventListener/removeEventListenerのみ実装）
function createFakeTarget() {
  const listeners = {};
  return {
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((l) => l !== fn);
    },
    dispatch(type, evt) {
      for (const fn of (listeners[type] || [])) fn(evt);
    },
  };
}

function keyEvent(key, repeat = false) {
  return { key, repeat, preventDefault() {} };
}

describe('input.js', () => {
  it('consumeは押下を1回だけ拾い、以後はfalseを返す', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    target.dispatch('keydown', keyEvent('z'));
    expect(input.consume('z')).toBe(true);
    expect(input.consume('z')).toBe(false);
  });

  it('長押し中のrepeat:trueなkeydownはconsume()を再発火させない', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    target.dispatch('keydown', keyEvent('z', false));
    expect(input.consume('z')).toBe(true); // 最初の押下ぶんを消費
    // ブラウザは押しっぱなしの間、repeat:trueのkeydownを繰り返し発火する
    target.dispatch('keydown', keyEvent('z', true));
    target.dispatch('keydown', keyEvent('z', true));
    expect(input.consume('z')).toBe(false); // 離していないので再度trueにはならない
  });

  it('keyup後に再度押せばconsumeは再びtrueを返す', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    target.dispatch('keydown', keyEvent('z'));
    expect(input.consume('z')).toBe(true);
    target.dispatch('keyup', keyEvent('z'));
    target.dispatch('keydown', keyEvent('z'));
    expect(input.consume('z')).toBe(true);
  });

  it('isDownは押下中trueを維持し、keyupでfalseになる', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    target.dispatch('keydown', keyEvent('ArrowUp'));
    expect(input.isDown('ArrowUp')).toBe(true);
    target.dispatch('keydown', keyEvent('ArrowUp', true)); // repeatでも押下中のまま
    expect(input.isDown('ArrowUp')).toBe(true);
    target.dispatch('keyup', keyEvent('ArrowUp'));
    expect(input.isDown('ArrowUp')).toBe(false);
  });

  it('destroyでリスナーを解除し、以後のイベントを無視する', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    input.destroy();
    target.dispatch('keydown', keyEvent('z'));
    expect(input.isDown('z')).toBe(false);
  });
});
