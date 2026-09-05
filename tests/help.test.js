// 操作方法の案内が、メッセージ窓にそのままの形で収まることを検証する。
// 行が長すぎたりページの切れ目がずれたりすると、案内が途中で分断されて読めなくなる。
import { describe, it, expect } from 'vitest';
import { HELP_PAGES, HELP_TEXT, HELP_LINES_PER_PAGE } from '../js/data/help.js';
import { paginateText } from '../js/engine/window.js';
import { annotateReadings } from '../js/data/readings.js';

const CHARS_PER_LINE = 12;

describe('操作方法の案内', () => {
  it('どの行も窓の1行に収まる', () => {
    const tooLong = HELP_PAGES.flat().filter((line) => line.length > CHARS_PER_LINE);
    expect(tooLong).toEqual([]);
  });

  it('どのページも窓の行数に収まる', () => {
    const tooMany = HELP_PAGES
      .map((page, i) => ({ i, n: page.length }))
      .filter(({ n }) => n > HELP_LINES_PER_PAGE);
    expect(tooMany).toEqual([]);
  });

  it('ページの切れ目が意図どおりに割れる', () => {
    // ふりがな付与を通したあとで窓に流しても、書いたページのまま出ること
    const pages = paginateText(
      annotateReadings(HELP_TEXT, CHARS_PER_LINE), CHARS_PER_LINE, HELP_LINES_PER_PAGE,
    );
    expect(pages.length).toBe(HELP_PAGES.length);
    expect(pages[0]).toEqual(HELP_PAGES[0]);
    expect(pages[1]).toEqual(HELP_PAGES[1]);
  });

  it('キーボードとタッチの両方の操作が書かれている', () => {
    expect(HELP_TEXT).toContain('キーボード');
    expect(HELP_TEXT).toContain('やじるし');
    expect(HELP_TEXT).toContain('十字ボタン');
    expect(HELP_TEXT).toContain('けってい');
    expect(HELP_TEXT).toContain('メニュー');
  });
});
