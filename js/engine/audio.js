// Web Audioによるチップチューン風のBGM・効果音。外部音源ファイルは使わない（依存ゼロ）。
// ブラウザの自動再生制限があるため、AudioContextは最初のキー入力後に unlock() で開始する。
// window/AudioContextがない環境（テスト実行時のNode）では全メソッドが何もしない。
import { TUNES } from '../data/music.js';

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const LOOKAHEAD_SEC = 0.3; // 先行スケジュール幅
const TICK_MS = 100;       // スケジューラーの起床間隔

export function createAudio() {
  let ctx = null;
  let master = null;
  let current = null; // 再生中BGM { name, timer, tracks: [{i, t}] }

  function ensureCtx() {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 1音をwhen秒に予約する。減衰エンベロープつきで角の立ちすぎを抑える
  function scheduleNote(freq, when, dur, type, gain) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, when);
    g.gain.setTargetAtTime(0, when + Math.max(dur - 0.03, 0.01), 0.015);
    osc.connect(g);
    g.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  // ループBGM：TICK_MSごとに起きて、現在時刻+LOOKAHEAD_SECまでの音を先行予約する
  function playBgm(name) {
    if (!ensureCtx()) return;
    if (current && current.name === name) return; // 同じ曲なら鳴らし直さない
    stopBgm();
    const tune = TUNES[name];
    if (!tune) return;
    const secPer16 = 60 / tune.tempo / 4;
    const startAt = ctx.currentTime + 0.05;
    const st = { name, tracks: tune.tracks.map(() => ({ i: 0, t: startAt })) };
    const pump = () => {
      for (let k = 0; k < tune.tracks.length; k++) {
        const tr = tune.tracks[k];
        const s = st.tracks[k];
        while (s.t < ctx.currentTime + LOOKAHEAD_SEC) {
          const [midi, len] = tr.notes[s.i];
          const dur = len * secPer16;
          if (midi > 0) scheduleNote(midiToFreq(midi), s.t, dur * 0.9, tr.type, tr.gain);
          s.t += dur;
          s.i = (s.i + 1) % tr.notes.length;
        }
      }
    };
    pump();
    st.timer = setInterval(pump, TICK_MS);
    current = st;
  }

  function stopBgm() {
    if (current) {
      clearInterval(current.timer);
      current = null;
    }
  }

  function playSfx(name) {
    if (!ensureCtx()) return;
    const now = ctx.currentTime;
    if (name === 'warp') {
      // 鳥居・穴をくぐる音：上昇アルペジオ＋きらめきの上昇スイープ
      [60, 67, 72, 79].forEach((m, i) => {
        scheduleNote(midiToFreq(m), now + i * 0.07, 0.16, 'triangle', 0.12);
      });
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now + 0.28);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.65);
      g.gain.setValueAtTime(0.07, now + 0.28);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc.connect(g);
      g.connect(master);
      osc.start(now + 0.28);
      osc.stop(now + 0.8);
    }
  }

  // 自動再生制限の解除（最初のユーザー操作時に呼ぶ）
  function unlock() {
    ensureCtx();
  }

  return { playBgm, stopBgm, playSfx, unlock };
}
