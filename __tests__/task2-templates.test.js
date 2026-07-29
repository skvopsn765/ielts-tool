import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RECORD_TYPE_SENTENCE,
  RECORD_TYPE_HINT,
  parseTask2Csv,
  getEssayTypeList,
  getDistinctSections,
  getDistinctFuncs,
  getDistinctDimensions,
  selectByType,
  selectMinimalSkeleton,
  selectCorePatterns,
  selectByParagraph,
  selectByFunc,
  selectByDimension,
  getVariantGroup,
  resolveGlossaryText,
  getCheatSheetGroups,
  maskWithPlaceholders,
} from "../lib/task2-templates";

const CSV_PATH = join(process.cwd(), "public", "data", "ielts-task2-templates-all.csv");
const csvText = readFileSync(CSV_PATH, "utf-8");
const rows = parseTask2Csv(csvText);

const TYPE7_ID = 7;
const TYPE7_SENTENCE_COUNT = 16;
const TYPE1_ID = 1;
const TYPE1_MINIMAL_COUNT = 12;
const TYPE3_ID = 3;
const CORE_PATTERN_COUNT = 46;
const TOTAL_ROW_COUNT = 180;
const TOTAL_SENTENCE_COUNT = 130;
const TOTAL_HINT_COUNT = 50;

describe("task2-templates: parsing", () => {
  it("strips the BOM and parses every row", () => {
    expect(rows).toHaveLength(TOTAL_ROW_COUNT);
    expect(rows.filter((row) => row.record_type === RECORD_TYPE_SENTENCE)).toHaveLength(
      TOTAL_SENTENCE_COUNT
    );
    expect(rows.filter((row) => row.record_type === RECORD_TYPE_HINT)).toHaveLength(TOTAL_HINT_COUNT);
  });

  it("coerces type_id, seq, is_default and optional to their proper types", () => {
    const firstRow = rows[0];
    expect(typeof firstRow.type_id).toBe("number");
    expect(typeof firstRow.seq).toBe("number");
    expect(typeof firstRow.is_default).toBe("boolean");
    expect(typeof firstRow.optional).toBe("boolean");
  });

  it("never splits `text` on the semicolon it may contain", () => {
    const conclusionRow = rows.find((row) => row.sentence_key === "c_m1_however_m2_personally");
    expect(conclusionRow.text).toBe("In conclusion, M1; however, M2. Personally, I believe Op.");
    expect(conclusionRow.blanks).toEqual(["M1", "M2", "Op"]);
  });
});

describe("task2-templates: essay type registry", () => {
  it("derives the essay type list from the data, not from a hardcoded count", () => {
    const types = getEssayTypeList(rows);
    expect(types).toHaveLength(9);
    expect(types.map((type) => type.typeId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("task2-templates: selection modes", () => {
  it("selects type 7 in the documented slot order", () => {
    const sentences = selectByType(rows, TYPE7_ID);
    expect(sentences).toHaveLength(TYPE7_SENTENCE_COUNT);
    expect(sentences.map((row) => row.slot)).toEqual([
      "I1",
      "I2",
      "I3",
      "B1-1",
      "B1-2",
      "B1-3",
      "B1-4",
      "B1-5",
      "B1-6",
      "B2-1",
      "B2-2",
      "B2-3",
      "B2-4",
      "B2-5",
      "B2-6",
      "C",
    ]);
  });

  it("minimal skeleton drops optional (concession) rows", () => {
    const minimal = selectMinimalSkeleton(rows, TYPE1_ID);
    expect(minimal).toHaveLength(TYPE1_MINIMAL_COUNT);
    expect(minimal.some((row) => row.optional)).toBe(false);
  });

  it("core patterns dedupe to exactly 46 items", () => {
    expect(selectCorePatterns(rows)).toHaveLength(CORE_PATTERN_COUNT);
  });

  it("filters by paragraph across all essay types", () => {
    const introRows = selectByParagraph(rows, "intro");
    expect(introRows.length).toBeGreaterThan(0);
    expect(introRows.every((row) => row.section === "intro")).toBe(true);
  });

  it("filters by function across all essay types", () => {
    const topicSentences = selectByFunc(rows, "topic_sentence");
    expect(topicSentences.length).toBeGreaterThan(0);
    expect(topicSentences.every((row) => row.func === "topic_sentence")).toBe(true);
  });

  it("filters by dimension", () => {
    const dualRows = selectByDimension(rows, "dual");
    expect(dualRows.length).toBeGreaterThan(0);
    expect(dualRows.every((row) => row.dimension === "dual")).toBe(true);
  });

  it("never crashes on an unknown enum value and derives distinct lists at runtime", () => {
    expect(getDistinctSections(rows)).toEqual(["intro", "body1", "body2", "conclusion"]);
    expect(getDistinctFuncs(rows).length).toBeGreaterThan(0);
    expect(getDistinctDimensions(rows)).toEqual(["single", "dual"]);
  });
});

describe("task2-templates: glossary two-step lookup", () => {
  it("resolves P1 differently per essay type (mandatory two-step lookup)", () => {
    const type7P1 = resolveGlossaryText(rows, TYPE7_ID, "P1");
    const type3P1 = resolveGlossaryText(rows, TYPE3_ID, "P1");
    expect(type7P1).toContain("問題");
    expect(type3P1).toContain("positive");
    expect(type7P1).not.toBe(type3P1);
  });

  it("falls back to the global (type_id 0) hint when there is no per-type match", () => {
    const globalToken = resolveGlossaryText(rows, TYPE1_ID, "T");
    expect(globalToken).not.toBe("");
  });

  it("returns an empty string for an unknown token instead of throwing", () => {
    expect(resolveGlossaryText(rows, TYPE1_ID, "NOT_A_TOKEN")).toBe("");
  });
});

describe("task2-templates: variants", () => {
  it("groups rows by (type_id, slot), currently one row per group", () => {
    const row = selectByType(rows, TYPE1_ID)[0];
    const group = getVariantGroup(rows, row);
    expect(group).toHaveLength(1);
    expect(group[0]).toBe(row);
  });
});

describe("task2-templates: cheat sheet", () => {
  it("groups rule hints by type_id, including the global group 0", () => {
    const groups = getCheatSheetGroups(rows);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].typeId).toBe(0);
    expect(groups.every((group) => group.rows.length > 0)).toBe(true);
  });
});

describe("task2-templates: placeholder-aware masking", () => {
  it("masks letters but leaves placeholder tokens fully visible", () => {
    const masked = maskWithPlaceholders("One main benefit is that A1.", ["A1"]);
    expect(masked).toBe("___ ____ _______ __ ____ A1.");
  });

  it("protects exactly the listed token (e.g. Ex1) without over-matching nearby letters", () => {
    const masked = maskWithPlaceholders("For example, Ex1.", ["Ex1"]);
    expect(masked).toBe("___ _______, Ex1.");
  });

  it("falls back to full letter masking when there are no blanks", () => {
    expect(maskWithPlaceholders("Hi there.", [])).toBe("__ _____.");
  });
});
