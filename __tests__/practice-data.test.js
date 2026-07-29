import { describe, expect, it } from "vitest";
import { buildNextSrsState, createFavoriteKey } from "../lib/practice-data";

const SAMPLE_SENTENCE = "The chart illustrates growth.";
const FIRST_SUCCESS_INTERVAL_DAYS = 1;
const SECOND_SUCCESS_INTERVAL_DAYS = 3;

describe("practice-data", () => {
  it("建立收藏鍵：以完整句子字串當作 key，並去除頭尾空白", () => {
    expect(createFavoriteKey(SAMPLE_SENTENCE)).toBe(SAMPLE_SENTENCE);
    expect(createFavoriteKey(`  ${SAMPLE_SENTENCE}  `)).toBe(SAMPLE_SENTENCE);
  });

  it("同一句子不論來自哪篇文章，收藏鍵都相同", () => {
    const keyFromArticleA = createFavoriteKey(SAMPLE_SENTENCE);
    const keyFromArticleB = createFavoriteKey(SAMPLE_SENTENCE);
    expect(keyFromArticleA).toBe(keyFromArticleB);
  });

  it("答錯時把複習間隔重設為 1 天", () => {
    const now = new Date("2026-07-27T00:00:00.000Z");
    const nextState = buildNextSrsState(
      {
        ease_factor: 2.5,
        interval_days: 7,
        repetitions: 3,
        success_count: 5,
        fail_count: 1,
      },
      false,
      SAMPLE_SENTENCE,
      now
    );

    expect(nextState.interval_days).toBe(FIRST_SUCCESS_INTERVAL_DAYS);
    expect(nextState.repetitions).toBe(0);
    expect(nextState.fail_count).toBe(2);
    expect(nextState.due_at).toBe("2026-07-28T00:00:00.000Z");
  });

  it("連續答對時拉長間隔", () => {
    const now = new Date("2026-07-27T00:00:00.000Z");
    const firstSuccess = buildNextSrsState(null, true, SAMPLE_SENTENCE, now);
    expect(firstSuccess.interval_days).toBe(FIRST_SUCCESS_INTERVAL_DAYS);

    const secondSuccess = buildNextSrsState(firstSuccess, true, SAMPLE_SENTENCE, now);
    expect(secondSuccess.interval_days).toBe(SECOND_SUCCESS_INTERVAL_DAYS);
  });
});
