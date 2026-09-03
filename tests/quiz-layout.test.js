// クイズ画面のレイアウト検証。選択肢にふりがなを添えるため行間を広げたので、
// 問題文が長い設問でも選択肢の窓が画面下端を越えないことを実データで保証する。
import { describe, it, expect } from 'vitest';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { READINGS, readingOf } from '../js/data/readings.js';
import { paginateText } from '../js/engine/window.js';
import { SCREEN_H, quizBottom, QUIZ_WIN_W } from '../js/data/uiLayout.js';

const CHARS_PER_LINE = 12;

// 全章のクイズ設問を集める
const allQuestions = [];
for (const [mapId, chapter] of Object.entries(CHAPTERS)) {
  for (const q of chapter.quiz || []) allQuestions.push({ mapId, q });
}

describe('クイズ画面のレイアウト', () => {
  it('全設問で問題文と選択肢が画面内に収まる', () => {
    const overflow = [];
    for (const { mapId, q } of allQuestions) {
      const lines = paginateText(q.q, CHARS_PER_LINE, 99)[0];
      const bottom = quizBottom(lines.length, q.choices.length);
      if (bottom > SCREEN_H) {
        overflow.push(`${mapId}「${q.q.replace(/\n/g, '')}」下端${bottom} > ${SCREEN_H}`);
      }
    }
    expect(overflow).toEqual([]);
  });

  it('選択肢の文字列が窓幅に収まる', () => {
    // 左の▶カーソルぶん28px、右余白12pxを差し引いた幅に収まること
    const maxChars = Math.floor((QUIZ_WIN_W - 28 - 12) / 16);
    const tooLong = [];
    for (const { mapId, q } of allQuestions) {
      for (const c of q.choices) {
        if (c.length > maxChars) tooLong.push(`${mapId}: 「${c}」${c.length}文字 > ${maxChars}文字`);
      }
    }
    expect(tooLong).toEqual([]);
  });
});

describe('ふりがな辞書', () => {
  it('登録されている読みはすべてひらがな', () => {
    const bad = Object.entries(READINGS).filter(([, r]) => !/^[ぁ-ゖー]+$/.test(r));
    expect(bad).toEqual([]);
  });

  it('辞書の見出し語が実際にクイズの選択肢として登場する', () => {
    const used = new Set();
    for (const { q } of allQuestions) for (const c of q.choices) used.add(c);
    const unused = Object.keys(READINGS).filter((w) => !used.has(w));
    expect(unused).toEqual([]);
  });

  // 読みが自明な語（黄金・舟・剣など）まで機械的に要求すると煩わしいので、
  // 訓読みでは読めない固有名詞だけを明示して検証する
  const MUST_HAVE_READING = [
    '草薙剣', '天沼矛', '十拳剣', '八咫鏡', '八咫烏',
    '淡路島', '佐渡島', '隠岐島', '筑紫島',
  ];

  it('難読な神器・地名に読みが登録されている', () => {
    const missing = MUST_HAVE_READING.filter((w) => !readingOf(w));
    expect(missing).toEqual([]);
  });

  it('未登録の語を引いてもnullが返るだけで壊れない', () => {
    expect(readingOf('存在しない語')).toBeNull();
    expect(readingOf('toString')).toBeNull(); // プロトタイプ由来の値を拾わないこと
  });
});
