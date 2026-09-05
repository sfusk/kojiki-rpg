// 本文へのふりがな付与（annotateReadings）の検証。
// 固有名詞のうしろへ「（よみ）」を添え、窓の幅で折り返すところまでを行う。
import { describe, it, expect } from 'vitest';
import { annotateReadings, READINGS } from '../js/data/readings.js';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { paginateText } from '../js/engine/window.js';

const CHARS_PER_LINE = 12;

describe('本文のふりがな', () => {
  it('固有名詞のうしろにかっこ書きで読みが入る', () => {
    expect(annotateReadings('高天原に')).toBe('高天原（たかまがはら）に');
  });

  it('同じ語には本文ひとつにつき一度だけ付ける', () => {
    const out = annotateReadings('高天原へ\n高天原から', 20);
    expect(out).toBe('高天原（たかまがはら）へ\n高天原から');
  });

  it('長い語を優先して読みを付ける（勾玉より八尺瓊勾玉）', () => {
    expect(annotateReadings('八尺瓊勾玉', 30)).toBe('八尺瓊勾玉（やさかにのまがたま）');
  });

  it('すでにかっこ書きが続く語には二重に付けない', () => {
    const text = '高天原（あまのはら）へ';
    expect(annotateReadings(text, 30)).toBe(text);
  });

  it('辞書にない語はそのまま返す', () => {
    expect(annotateReadings('ただの文です', 30)).toBe('ただの文です');
  });

  it('空文字やnullでも壊れない', () => {
    expect(annotateReadings('')).toBe('');
    expect(annotateReadings(null)).toBe('');
    expect(annotateReadings(undefined)).toBe('');
  });

  it('段落を分ける空行が消えない', () => {
    expect(annotateReadings('前の段落\n\n次の段落', 20)).toBe('前の段落\n\n次の段落');
  });

  it('読みを付けて伸びた行は窓の幅で折り返す', () => {
    // 「高天原に三柱の神が現れ」(11文字)＋読み(8文字)＝19文字を2行に割る
    const out = annotateReadings('高天原に三柱の神が現れ', CHARS_PER_LINE);
    expect(out.split('\n')).toEqual(['高天原（たかまがはら）に', '三柱の神が現れ']);
    for (const line of out.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(CHARS_PER_LINE);
    }
  });

  it('窓に収まる読みは行またぎで断ち切らない', () => {
    // 「（たかまがはら）」が「（たかまがは」「ら）」に割れると読めない
    const out = annotateReadings('その時に高天原の神が', CHARS_PER_LINE);
    for (const line of out.split('\n')) {
      const opens = (line.match(/（/g) || []).length;
      const closes = (line.match(/）/g) || []).length;
      expect(opens).toBe(closes);
    }
  });

  it('語と読みの合計が長すぎるときは語と読みで行を分ける', () => {
    const out = annotateReadings('木花之佐久夜毘売', CHARS_PER_LINE).split('\n');
    expect(out[0]).toBe('木花之佐久夜毘売');
    expect(out[1]).toBe('（このはなのさくやびめ）');
  });

  it('全章の本文にふりがなを付けても窓からはみ出さない', () => {
    const overflow = [];
    for (const [id, chapter] of Object.entries(CHAPTERS)) {
      for (const which of ['prologue', 'epilogue']) {
        if (!chapter[which]) continue;
        const pages = paginateText(annotateReadings(chapter[which], CHARS_PER_LINE), CHARS_PER_LINE, 8);
        for (const page of pages) {
          for (const line of page) {
            if (line.length > CHARS_PER_LINE) overflow.push(`${id}.${which}: 「${line}」`);
          }
        }
      }
    }
    expect(overflow).toEqual([]);
  });

  it('どの読みもかっこ込みで1行に収まる', () => {
    // 窓幅を超える読みは折り返しで断ち切られ「（うがやふきあえずのみ／こと）」
    // のようになってしまう。長い名は末尾の「剣」「命」を読みから外して収める。
    const over = Object.entries(READINGS)
      .filter(([, r]) => r.length + 2 > CHARS_PER_LINE)
      .map(([w, r]) => `${w}（${r}）`);
    expect(over).toEqual([]);
  });
});
