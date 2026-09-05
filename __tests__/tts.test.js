import { describe, expect, it } from "vitest";
import {
  TTS_RATE_DEFAULT,
  TTS_RATE_MAX,
  TTS_RATE_MIN,
  clampTtsRate,
  countWords,
  splitPastedArticleIntoSentences,
} from "../lib/tts";

describe("splitPastedArticleIntoSentences", () => {
  it("returns an empty list for blank input", () => {
    expect(splitPastedArticleIntoSentences("")).toEqual([]);
    expect(splitPastedArticleIntoSentences("   \n  ")).toEqual([]);
    expect(splitPastedArticleIntoSentences(null)).toEqual([]);
  });

  it("splits English sentences on . ! ?", () => {
    const sentences = splitPastedArticleIntoSentences("Hello world. How are you? I am fine!");
    expect(sentences.map((item) => item.text)).toEqual([
      "Hello world.",
      "How are you?",
      "I am fine!",
    ]);
  });

  it("keeps paragraph breaks as separators", () => {
    const sentences = splitPastedArticleIntoSentences("First sentence.\n\nSecond sentence.");
    expect(sentences).toEqual([
      { text: "First sentence.", separator: "\n\n" },
      { text: "Second sentence.", separator: " " },
    ]);
  });

  it("splits Chinese punctuation and trailing text without a terminator", () => {
    const sentences = splitPastedArticleIntoSentences("這是第一句。這是第二句！還有半句");
    expect(sentences.map((item) => item.text)).toEqual(["這是第一句。", "這是第二句！", "還有半句"]);
  });
});

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("  one two   three ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});

describe("clampTtsRate", () => {
  it("keeps rates inside the supported playback range", () => {
    expect(clampTtsRate(TTS_RATE_MIN - 1)).toBe(TTS_RATE_MIN);
    expect(clampTtsRate(TTS_RATE_MAX + 1)).toBe(TTS_RATE_MAX);
    expect(clampTtsRate("1.2")).toBe(1.2);
    expect(clampTtsRate("fast")).toBe(TTS_RATE_DEFAULT);
  });
});
