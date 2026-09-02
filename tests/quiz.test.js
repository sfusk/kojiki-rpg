import { describe, it, expect } from 'vitest';
import { createQuiz, answerQuiz } from '../js/engine/quiz.js';

const qs = [
  { q: '1+1?', choices: ['1', '2', '3', '4'], answer: 1, explain: '2です' },
  { q: '2+2?', choices: ['2', '3', '4', '5'], answer: 2, explain: '4です' },
];

describe('クイズ進行', () => {
  it('正解で次の問題へ進む', () => {
    const quiz = createQuiz(qs);
    const r = answerQuiz(quiz, 1);
    expect(r).toEqual({ correct: true, explain: '2です', finished: false });
    expect(quiz.index).toBe(1);
  });
  it('不正解は同じ問題にとどまる', () => {
    const quiz = createQuiz(qs);
    const r = answerQuiz(quiz, 0);
    expect(r.correct).toBe(false);
    expect(quiz.index).toBe(0);
  });
  it('全問正解でfinished', () => {
    const quiz = createQuiz(qs);
    answerQuiz(quiz, 1);
    const r = answerQuiz(quiz, 2);
    expect(r.finished).toBe(true);
  });
});
