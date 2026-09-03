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
  let current = null;      // 再生中BGM { name, timer, tracks: [{i, t}] }
  let enabled = true;      // BGMを鳴らすか（メニューから切り替える）
  let lastRequested = null; // 消音中に要求された曲。再開時にこれを鳴らす

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

  // ブレスノイズ用のホワイトノイズバッファ（1秒分を使い回す）
  let noiseBuf = null;
  function getNoiseBuf() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  // 和琴：弦を爪弾く音。鋭い立ち上がり＋指数減衰、オクターブ上の倍音を重ねて弦の張りを出す
  function playKoto(freq, when, dur, gain) {
    const decay = Math.min(Math.max(dur * 1.3, 0.4), 1.6);
    const body = ctx.createOscillator();
    const bg = ctx.createGain();
    body.type = 'triangle';
    body.frequency.value = freq;
    bg.gain.setValueAtTime(gain, when);
    bg.gain.exponentialRampToValueAtTime(0.001, when + decay);
    body.connect(bg);
    bg.connect(master);
    body.start(when);
    body.stop(when + decay + 0.05);

    const harm = ctx.createOscillator();
    const hg = ctx.createGain();
    harm.type = 'sine';
    harm.frequency.value = freq * 2;
    hg.gain.setValueAtTime(gain * 0.5, when);
    hg.gain.exponentialRampToValueAtTime(0.001, when + decay * 0.35);
    harm.connect(hg);
    hg.connect(master);
    harm.start(when);
    harm.stop(when + decay * 0.4);
  }

  // 尺八：息の混ざった笛の音。柔らかい立ち上がり＋ビブラート＋帯域ノイズのブレス
  function playShakuhachi(freq, when, dur, gain) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const attack = Math.min(0.1, dur * 0.3);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + attack);
    g.gain.setValueAtTime(gain, when + Math.max(dur - 0.12, attack));
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g);
    g.connect(master);

    // ビブラート（音が伸びるほど揺れが深くなる）
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 5;
    lfoGain.gain.setValueAtTime(0, when);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.008, when + Math.min(dur, 0.6));
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(when);
    lfo.stop(when + dur + 0.05);

    // ブレスノイズ：音程近辺の帯域だけ薄く重ねる
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuf();
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 2;
    bp.Q.value = 2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, when);
    ng.gain.exponentialRampToValueAtTime(gain * 0.18, when + attack);
    ng.gain.exponentialRampToValueAtTime(0.001, when + dur);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(master);
    noise.start(when);
    noise.stop(when + dur + 0.05);

    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  // 1音をwhen秒に予約する。typeが楽器名なら専用シンセ、波形名なら素の発振器
  function scheduleNote(freq, when, dur, type, gain) {
    if (type === 'koto') { playKoto(freq, when, dur, gain); return; }
    if (type === 'shakuhachi') { playShakuhachi(freq, when, dur, gain); return; }
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
    lastRequested = name; // 消音中でも「今どの曲であるべきか」は覚えておく
    if (!enabled) return;
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
    if (!enabled) return;
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

  function isEnabled() {
    return enabled;
  }

  // BGMの入切。切ったら即座に止め、入れたら本来鳴っているはずの曲を再開する
  function setEnabled(next) {
    enabled = next;
    if (!enabled) {
      stopBgm();
      return;
    }
    if (lastRequested) {
      const name = lastRequested;
      current = null; // 同じ曲でも鳴らし直せるようにする
      playBgm(name);
    }
  }

  function toggle() {
    setEnabled(!enabled);
    return enabled;
  }

  return { playBgm, stopBgm, playSfx, unlock, isEnabled, setEnabled, toggle };
}
