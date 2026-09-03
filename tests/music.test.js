import { describe, it, expect } from 'vitest';
import { TUNES } from '../js/data/music.js';
import { midiToFreq } from '../js/engine/audio.js';

describe('midiToFreq', () => {
  it('A4(69)は440Hz', () => expect(midiToFreq(69)).toBeCloseTo(440));
  it('1オクターブ上(81)は880Hz', () => expect(midiToFreq(81)).toBeCloseTo(880));
  it('1オクターブ下(57)は220Hz', () => expect(midiToFreq(57)).toBeCloseTo(220));
});

describe('BGM譜面データ', () => {
  const names = Object.keys(TUNES);

  it('field と battle の2曲が定義されている', () => {
    expect(names).toContain('field');
    expect(names).toContain('battle');
  });

  for (const name of names) {
    const tune = TUNES[name];
    it(`${name}: テンポが正の数`, () => {
      expect(tune.tempo).toBeGreaterThan(0);
    });
    it(`${name}: 各トラックの音符が有効（音域24-96またはrest0、長さは正の整数）`, () => {
      for (const tr of tune.tracks) {
        expect(['square', 'triangle', 'sine', 'sawtooth', 'koto', 'shakuhachi']).toContain(tr.type);
        expect(tr.gain).toBeGreaterThan(0);
        expect(tr.gain).toBeLessThanOrEqual(0.2); // 音割れ防止の上限
        expect(tr.notes.length).toBeGreaterThan(0);
        for (const [midi, len] of tr.notes) {
          expect(midi === 0 || (midi >= 24 && midi <= 96)).toBe(true);
          expect(Number.isInteger(len)).toBe(true);
          expect(len).toBeGreaterThan(0);
        }
      }
    });
    it(`${name}: 全トラックの合計長が一致する（ループずれ防止）`, () => {
      const totals = tune.tracks.map(
        (tr) => tr.notes.reduce((sum, [, len]) => sum + len, 0),
      );
      for (const t of totals) expect(t).toBe(totals[0]);
    });
  }
});
