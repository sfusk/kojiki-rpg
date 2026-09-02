export function createQuiz(questions) { return { questions, index: 0 }; }
export function answerQuiz(quiz, choiceIndex) {
  const q = quiz.questions[quiz.index];
  const correct = choiceIndex === q.answer;
  if (correct) quiz.index += 1;
  return { correct, explain: q.explain, finished: quiz.index >= quiz.questions.length };
}
