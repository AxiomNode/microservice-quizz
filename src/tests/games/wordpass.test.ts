import { describe, expect, it } from "vitest";

import { buildPrimaryWordpassText, isGenericWordpassHint, wordpassStrategy } from "../../app/games/wordpass.js";

describe("word-pass strategy", () => {
  it("exposes the word-pass identity and defaults (port unified to 7100)", () => {
    expect(wordpassStrategy).toMatchObject({
      gameType: "word-pass",
      serviceName: "microservice-wordpass",
      groupedBy: ["category", "language"],
      includeMatrixCoverage: true,
      maxTokens: 1024,
      defaults: { port: 7100, generationEndpoint: "/generate/word-pass", ingestEndpoint: "/ingest/word-pass", maxItemsDefault: 10 },
    });
  });

  it("accepts an optional letters field on the generate body, and still requires categoryId", () => {
    expect(wordpassStrategy.generateSchema.safeParse({ categoryId: "9", letters: "A,B" }).success).toBe(true);
    expect(wordpassStrategy.generateSchema.safeParse({ categoryId: "9" }).success).toBe(true);
    expect(wordpassStrategy.generateSchema.safeParse({ letters: "A,B" }).success).toBe(false);
    expect(wordpassStrategy.generateSchema.safeParse({ categoryId: "9", letters: 5 }).success).toBe(false);
  });

  describe("contentSignature", () => {
    it("sorts normalised words so the order of the words does not matter", () => {
      expect(wordpassStrategy.contentSignature({ words: [{ word: "Árbol" }, { word: "Casa" }] })).toBe("arbol|casa");
      expect(wordpassStrategy.contentSignature({ words: [{ word: "Casa" }, { word: "Árbol" }] })).toBe("arbol|casa");
    });

    it("reads answer as well as word (extractWordpassWords), inside or outside the game wrapper", () => {
      expect(wordpassStrategy.contentSignature({ game: { words: [{ answer: "Uno" }, { word: "Dos" }] } })).toBe("dos|uno");
    });

    it("returns null when there are no words", () => {
      expect(wordpassStrategy.contentSignature({ game: { words: [] } })).toBeNull();
      expect(wordpassStrategy.contentSignature({ game: { questions: [{ question: "q" }] } })).toBeNull();
    });
  });

  describe("prompt variants", () => {
    const base = "History fundamentals introduction";

    it("cycles through the three letter sets by attempt and always sends letters", () => {
      const letters = [0, 1, 2, 3].map(
        (attempt) => wordpassStrategy.nextPromptVariant({ attempt, base, cycleLength: 99 }).requestExtras?.letters,
      );
      expect(letters[0]).toBe("A,B,C,D,E,F,G,H,I,J,L,M,N,O,P,R,S,T,V,Z");
      expect(letters[1]).toBe("A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z");
      expect(letters[2]).toBe("A,C,E,G,I,K,L,M,N,O,P,R,S,T,U,V");
      expect(letters[3]).toBe(letters[0]);
    });

    it("builds the word-pass prompt", () => {
      expect(wordpassStrategy.nextPromptVariant({ attempt: 0, base, cycleLength: 1 }).query).toBe(
        `${base} word-pass avoid ambiguous or nonsensical answers`,
      );
    });
  });

  describe("buildPrimaryWordpassText", () => {
    it("prefers the first informative definition and skips generic placeholders", () => {
      const payload = {
        game: {
          words: [
            { word: "uno", definition: "  A frequent real word  " },
            { word: "dos", definition: "  The number after one  " },
          ],
        },
      };
      expect(buildPrimaryWordpassText(payload, "fallback")).toBe("The number after one");
    });

    it("detects the generic hints regardless of accents and case", () => {
      for (const generic of ["Frequent Réal Word", "FrequencyWords list", "word frequency", "A frequent term"]) {
        const payload = { words: [{ word: "x", definition: generic }, { word: "y", definition: "Specific meaning" }] };
        expect(buildPrimaryWordpassText(payload, "fallback")).toBe("Specific meaning");
      }
    });

    it("falls back to the first definition when every definition is generic", () => {
      const payload = { words: [{ word: "x", definition: "word frequency" }, { word: "y", definition: "frequent term" }] };
      expect(buildPrimaryWordpassText(payload, "fallback")).toBe("word frequency");
    });

    it("falls back to the first answer, then to the fallback text, then to word-pass", () => {
      expect(buildPrimaryWordpassText({ words: [{ answer: "Casa", definition: "" }] }, "fallback")).toBe("Definition of Casa");
      expect(buildPrimaryWordpassText({ words: [] }, "  History difficulty 40  ")).toBe("History difficulty 40");
      expect(buildPrimaryWordpassText({ words: [] }, "   ")).toBe("word-pass");
    });

    it("caps the text at 240 characters", () => {
      const long = "d".repeat(300);
      expect(buildPrimaryWordpassText({ words: [{ word: "x", definition: long }] }, "f")).toHaveLength(240);
      expect(buildPrimaryWordpassText({ words: [{ answer: "w".repeat(300) }] }, "f")).toHaveLength(240);
      expect(buildPrimaryWordpassText({ words: [] }, "f".repeat(300))).toHaveLength(240);
    });
  });

  it("detects generic frequency hints and lets specific ones through", () => {
    expect(isGenericWordpassHint("A Frequent Real Word")).toBe(true);
    expect(isGenericWordpassHint("FrequencyWords list")).toBe(true);
    expect(isGenericWordpassHint("Word frequency table")).toBe(true);
    expect(isGenericWordpassHint("frequent term")).toBe(true);
    expect(isGenericWordpassHint("A tool for cutting wood")).toBe(false);
  });

  it("uses the hint of an answer entry as the stored text and falls back to the supplied text, then to a constant", () => {
    expect(
      buildPrimaryWordpassText({ game: { words: [{ hint: "Definicion de casa: termino comun.", answer: "casa" }] } }, "fallback"),
    ).toBe("Definicion de casa: termino comun.");
    expect(buildPrimaryWordpassText({}, "  fallback text  ")).toBe("fallback text");
    expect(buildPrimaryWordpassText({}, "   ")).toBe("word-pass");
  });

  it("builds stored and manual queries from the content", () => {
    const content = { game: { words: [{ word: "Sigma", definition: "A Greek letter" }] } };
    expect(wordpassStrategy.storedQuery(content, "requested prompt")).toBe("A Greek letter");
    expect(wordpassStrategy.manualQuery("History", 40, content)).toBe("A Greek letter");
    expect(wordpassStrategy.manualQuery("History", 40, { words: [] })).toBe("History difficulty 40");
  });

  it("sanitizes generated payloads: letter is optional, definition and word are required", () => {
    const expected = { game: { words: [{ id: "w-1", definition: "Pista", word: "Algo" }] } };
    expect(() => wordpassStrategy.canonicalize(null)).toThrow("Generated payload is not a valid object");
    expect(wordpassStrategy.canonicalize({ words: [{ letter: "A", hint: "Pista", answer: "Algo" }] })).toEqual(expected);
    expect(wordpassStrategy.canonicalize({ words: [{ hint: "Pista", answer: "Algo" }] })).toEqual(expected);
    expect(() => wordpassStrategy.canonicalize({ words: [{ letter: "A", answer: "Algo" }] })).toThrow("missing the 'definition'");
    expect(() => wordpassStrategy.canonicalize({ words: [{ letter: "A", hint: "Pista" }] })).toThrow("missing the 'word'");
  });

  it("canonicalizes word-pass models and rejects empty ones", () => {
    expect(wordpassStrategy.canonicalize({ word: "Sigma", hint: "A Greek letter" })).toEqual({
      game: { words: [{ id: "w-1", definition: "A Greek letter", word: "Sigma" }] },
    });
    expect(() => wordpassStrategy.canonicalize({})).toThrow("Generated word-pass has no words");
  });
});
