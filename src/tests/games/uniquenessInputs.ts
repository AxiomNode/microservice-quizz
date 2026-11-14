/**
 * @module uniquenessInputs - Payloads used to pin `uniquenessKey` values. The expected hashes in
 * uniquenessVectors.json were produced by the pre-merge services themselves (quizz 03d2f89 and word-pass
 * 0271474), each calling its own private buildUniquenessKey with its own game type.
 */

export interface UniquenessInput {
  name: string;
  payload: unknown;
}

export const UNIQUENESS_INPUTS: UniquenessInput[] = [
  {
    name: "canonical quiz, one question with accents and punctuation",
    payload: {
      game: {
        questions: [
          { id: "q-1", question: "¿Capital de Perú?", answers: ["Lima", "Cusco"], correctIndex: 0 },
        ],
      },
    },
  },
  {
    name: "canonical quiz, two questions (order matters)",
    payload: {
      game: {
        questions: [
          { id: "q-1", question: "Second   One", answers: ["a", "b"], correctIndex: 0 },
          { id: "q-2", question: "First one!", answers: ["a", "b"], correctIndex: 1 },
        ],
      },
    },
  },
  {
    name: "canonical quiz, the same two questions in the other order",
    payload: {
      game: {
        questions: [
          { id: "q-1", question: "First one!", answers: ["a", "b"], correctIndex: 1 },
          { id: "q-2", question: "Second   One", answers: ["a", "b"], correctIndex: 0 },
        ],
      },
    },
  },
  {
    name: "raw quiz questions at the top level (no game wrapper)",
    payload: { questions: [{ question: "Top level question" }] },
  },
  {
    name: "quiz with empty questions falls back to the stable JSON",
    payload: { game: { questions: [] }, extra: { b: 1, a: [2, 1] } },
  },
  {
    name: "canonical word-pass, unsorted words with accents and duplicates",
    payload: {
      game: {
        words: [
          { id: "w-1", definition: "A tree", word: "Árbol" },
          { id: "w-2", definition: "A house", word: "Casa" },
          { id: "w-3", definition: "Another house", word: "casa" },
        ],
      },
    },
  },
  {
    name: "canonical word-pass, the same words in the other order",
    payload: {
      game: {
        words: [
          { id: "w-1", definition: "A house", word: "Casa" },
          { id: "w-2", definition: "Another house", word: "casa" },
          { id: "w-3", definition: "A tree", word: "Árbol" },
        ],
      },
    },
  },
  {
    name: "raw word-pass entries that only carry `answer` and `hint`",
    payload: { game: { words: [{ answer: "Uno", hint: "One" }, { answer: "Dos", hint: "Two" }] } },
  },
  {
    name: "word-pass words at the top level mixing `word` and `answer`",
    payload: { words: [{ word: "Zeta", definition: "z" }, { answer: "Alfa", definition: "a" }] },
  },
  {
    name: "word-pass whose words normalise to nothing",
    payload: { game: { words: [{ word: "!!!", definition: "noise" }, { word: "...", definition: "noise" }] } },
  },
  {
    name: "word-pass with an empty words array falls back to the stable JSON",
    payload: { game: { words: [] } },
  },
  {
    name: "payload that is neither quiz nor word-pass",
    payload: { game: { riddles: [{ text: "x" }] } },
  },
  { name: "null payload", payload: null },
  { name: "string payload", payload: "just text" },
  { name: "array payload", payload: [{ word: "inside" }] },
];
