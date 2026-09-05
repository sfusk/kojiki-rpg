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

describe('メッセージ送り（consumeAdvance）', () => {
  it('決定キーでも下矢印でも送れる', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    target.dispatch('keydown', keyEvent('z'));
    expect(input.consumeAdvance()).toBe(true);
    target.dispatch('keydown', keyEvent('ArrowDown'));
    expect(input.consumeAdvance()).toBe(true);
  });

  it('Enterでも送れる（zに正規化される）', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    target.dispatch('keydown', keyEvent('Enter'));
    expect(input.consumeAdvance()).toBe(true);
  });

  it('どちらも押していなければ送らない', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    expect(input.consumeAdvance()).toBe(false);
    target.dispatch('keydown', keyEvent('ArrowUp'));
    expect(input.consumeAdvance()).toBe(false);
  });

  it('一度の押下で一度だけ送る（押しっぱなしで送り続けない）', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    target.dispatch('keydown', keyEvent('ArrowDown'));
    expect(input.consumeAdvance()).toBe(true);
    target.dispatch('keydown', keyEvent('ArrowDown', true)); // 長押しのリピート
    expect(input.consumeAdvance()).toBe(false);
  });

  it('送りに使った下矢印は移動には使われない', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    target.dispatch('keydown', keyEvent('ArrowDown'));
    expect(input.consumeAdvance()).toBe(true);
    expect(input.consume('ArrowDown')).toBe(false);
    expect(input.isDown('ArrowDown')).toBe(false);
  });

  it('離してから押し直せばまた送れる', () => {
    const target = createFakeTarget();
    const input = createInput(target);
    target.dispatch('keydown', keyEvent('ArrowDown'));
    expect(input.consumeAdvance()).toBe(true);
    target.dispatch('keyup', keyEvent('ArrowDown'));
    target.dispatch('keydown', keyEvent('ArrowDown'));
    expect(input.consumeAdvance()).toBe(true);
  });
});

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
