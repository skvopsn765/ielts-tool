import Papa from "papaparse";

/**
 * Data layer for the IELTS Writing Task 2 sentence-skeleton CSV.
 *
 * The CSV is the single source of truth for Task 2 practice content. Nothing
 * in this module (or its callers) should hardcode sentence text, type names,
 * counts, or orderings -- everything is derived from the parsed rows so that
 * adding a new essay type only requires editing the CSV file.
 *
 * See docs/APP_SPEC_csv_migration.md style contract:
 * - Every raw CSV cell is a string; all number/boolean coercion happens once,
 *   here, in `normalizeTask2Row`.
 * - `seq` is spaced by 10 and must never be used as an array index.
 * - `func`, `type_id`, and `section` are open enums: unknown values must be
 *   displayed verbatim rather than crashing or being filtered out silently.
 */

export const TASK2_CSV_ASSET_PATH = "/data/ielts-task2-templates-all.csv";

export const RECORD_TYPE_SENTENCE = "sentence";
export const RECORD_TYPE_HINT = "hint";

export const DIMENSION_SINGLE = "single";
export const DIMENSION_DUAL = "dual";

export const HINT_FUNC_GLOSSARY = "glossary";
export const HINT_FUNC_RULE = "rule";

export const GLOBAL_TYPE_ID = 0;

const CSV_BOOLEAN_TRUE = "1";
const BLANKS_DELIMITER = ";";
const CSV_BOM_RE = /^\uFEFF/;
const REGEX_SPECIAL_CHAR_RE = /[.*+?^${}()|[\]\\]/g;
const REGEX_ESCAPE_REPLACEMENT = "\\$&";
const NOT_A_NUMBER_FALLBACK = 0;
const LETTER_RE = /[A-Za-z]/;
const MASK_CHAR = "_";
const EMPTY_STRING = "";

const SECTION_DISPLAY_ORDER = ["intro", "body1", "body2", "conclusion"];
const FUNC_DISPLAY_ORDER = [
  "background",
  "paraphrase",
  "thesis",
  "topic_sentence",
  "explain",
  "example",
  "result",
  "second_point",
  "concession",
  "summary",
];
const DIMENSION_DISPLAY_ORDER = [DIMENSION_SINGLE, DIMENSION_DUAL];

/**
 * @typedef {Object} Task2Row
 * @property {"sentence"|"hint"} record_type
 * @property {number} type_id 0 means "not an essay type" (global hint rows only)
 * @property {string} type_name_zh
 * @property {string} type_name_en
 * @property {"single"|"dual"|""} dimension
 * @property {"intro"|"body1"|"body2"|"conclusion"|""} section
 * @property {number} seq sort order within one essay type, spaced by 10, has gaps
 * @property {string} slot legacy position label, display-only
 * @property {string} func open enum, always fall back to verbatim display
 * @property {number} variant_no
 * @property {boolean} is_default
 * @property {boolean} optional
 * @property {string} sentence_key pattern fingerprint used for dedupe
 * @property {string} text the sentence itself, may contain placeholder tokens
 * @property {string[]} blanks placeholder tokens occurring in `text`
 * @property {string} note_zh short Chinese note on the sentence's job
 */

function toInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? NOT_A_NUMBER_FALLBACK : parsed;
}

function toBoolean(value) {
  return value === CSV_BOOLEAN_TRUE;
}

function toBlankList(value) {
  if (!value) return [];
  return value
    .split(BLANKS_DELIMITER)
    .map((token) => token.trim())
    .filter(Boolean);
}

/**
 * Normalise one raw CSV record (every field a string) into a typed Task2Row.
 * This is the single point where string -> number/boolean coercion happens;
 * nothing downstream should touch a raw string field again.
 * @param {Record<string, string>} raw
 * @returns {Task2Row}
 */
export function normalizeTask2Row(raw) {
  const dimension = raw.dimension === DIMENSION_SINGLE || raw.dimension === DIMENSION_DUAL ? raw.dimension : EMPTY_STRING;

  return {
    record_type: raw.record_type === RECORD_TYPE_HINT ? RECORD_TYPE_HINT : RECORD_TYPE_SENTENCE,
    type_id: toInt(raw.type_id),
    type_name_zh: raw.type_name_zh ?? EMPTY_STRING,
    type_name_en: raw.type_name_en ?? EMPTY_STRING,
    dimension,
    section: raw.section ?? EMPTY_STRING,
    seq: toInt(raw.seq),
    slot: raw.slot ?? EMPTY_STRING,
    func: raw.func ?? EMPTY_STRING,
    variant_no: toInt(raw.variant_no),
    is_default: toBoolean(raw.is_default),
    optional: toBoolean(raw.optional),
    sentence_key: raw.sentence_key ?? EMPTY_STRING,
    text: raw.text ?? EMPTY_STRING,
    blanks: toBlankList(raw.blanks),
    note_zh: raw.note_zh ?? EMPTY_STRING,
  };
}

/**
 * Parse the raw CSV text (UTF-8 with BOM, CRLF, RFC-4180 quoting) into
 * normalised rows. Trap: `text` may itself contain a semicolon, so we only
 * ever split on `;` for the dedicated `blanks` column, never for `text`.
 * @param {string} csvText
 * @returns {Task2Row[]}
 */
export function parseTask2Csv(csvText) {
  const { data } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.replace(CSV_BOM_RE, EMPTY_STRING).trim(),
  });
  return data.map(normalizeTask2Row);
}

let cachedRowsPromise = null;

/**
 * Fetch and parse the Task 2 CSV once at app start, caching the promise so
 * repeated calls (e.g. from multiple components) share one network request.
 * @returns {Promise<Task2Row[]>}
 */
export function loadTask2Rows() {
  if (!cachedRowsPromise) {
    cachedRowsPromise = fetch(TASK2_CSV_ASSET_PATH)
      .then((response) => response.text())
      .then((csvText) => parseTask2Csv(csvText))
      .catch((error) => {
        cachedRowsPromise = null;
        throw error;
      });
  }
  return cachedRowsPromise;
}

function isSentenceRow(row) {
  return row.record_type === RECORD_TYPE_SENTENCE;
}

function isHintRow(row) {
  return row.record_type === RECORD_TYPE_HINT;
}

function bySeqThenTypeId(a, b) {
  if (a.seq !== b.seq) return a.seq - b.seq;
  return a.type_id - b.type_id;
}

function sortByKnownOrderThenAppend(values, knownOrder) {
  const known = knownOrder.filter((value) => values.has(value));
  const unknown = [...values].filter((value) => !knownOrder.includes(value));
  return [...known, ...unknown];
}

/**
 * Distinct essay types present in the data, derived at runtime. Never assume
 * a fixed number of types -- the type picker must grow with the CSV.
 * @param {Task2Row[]} rows
 */
export function getEssayTypeList(rows) {
  const typeMap = new Map();
  rows.filter(isSentenceRow).forEach((row) => {
    if (!typeMap.has(row.type_id)) {
      typeMap.set(row.type_id, {
        typeId: row.type_id,
        typeNameZh: row.type_name_zh,
        typeNameEn: row.type_name_en,
        dimension: row.dimension,
      });
    }
  });
  return [...typeMap.values()].sort((a, b) => a.typeId - b.typeId);
}

/** @returns {string[]} distinct `section` values found on sentence rows */
export function getDistinctSections(rows) {
  const found = new Set(rows.filter(isSentenceRow).map((row) => row.section).filter(Boolean));
  return sortByKnownOrderThenAppend(found, SECTION_DISPLAY_ORDER);
}

/** @returns {string[]} distinct `func` values found on sentence rows */
export function getDistinctFuncs(rows) {
  const found = new Set(rows.filter(isSentenceRow).map((row) => row.func).filter(Boolean));
  return sortByKnownOrderThenAppend(found, FUNC_DISPLAY_ORDER);
}

/** @returns {string[]} distinct `dimension` values found on sentence rows */
export function getDistinctDimensions(rows) {
  const found = new Set(rows.filter(isSentenceRow).map((row) => row.dimension).filter(Boolean));
  return sortByKnownOrderThenAppend(found, DIMENSION_DISPLAY_ORDER);
}

/** By essay type: default variant, in seq order. */
export function selectByType(rows, typeId) {
  return rows
    .filter((row) => isSentenceRow(row) && row.type_id === typeId && row.is_default)
    .sort(bySeqThenTypeId);
}

/** Minimal skeleton: by essay type, excluding rows the user may skip (optional=1). */
export function selectMinimalSkeleton(rows, typeId) {
  return selectByType(rows, typeId).filter((row) => !row.optional);
}

/**
 * Core patterns: one row per distinct `sentence_key` across all types.
 * This is the highest-value mode -- surface it prominently in the UI.
 */
export function selectCorePatterns(rows) {
  const defaultSentences = rows
    .filter((row) => isSentenceRow(row) && row.is_default)
    .sort(bySeqThenTypeId);

  const firstBySentenceKey = new Map();
  defaultSentences.forEach((row) => {
    if (!firstBySentenceKey.has(row.sentence_key)) {
      firstBySentenceKey.set(row.sentence_key, row);
    }
  });
  return [...firstBySentenceKey.values()];
}

/** By paragraph: filter on `section`, across all essay types. */
export function selectByParagraph(rows, section) {
  return rows
    .filter((row) => isSentenceRow(row) && row.is_default && row.section === section)
    .sort(bySeqThenTypeId);
}

/** By function: filter on `func`, across all essay types. */
export function selectByFunc(rows, func) {
  return rows
    .filter((row) => isSentenceRow(row) && row.is_default && row.func === func)
    .sort(bySeqThenTypeId);
}

/** By dimension: filter on `dimension` to drill types 1-5 or 6-9 separately. */
export function selectByDimension(rows, dimension) {
  return rows
    .filter((row) => isSentenceRow(row) && row.is_default && row.dimension === dimension)
    .sort(bySeqThenTypeId);
}

/**
 * All variants sharing the same (type_id, slot) as `row`. Never assume this
 * pair is unique -- it is unique today but will not stay that way once
 * alternative wordings are added.
 */
export function getVariantGroup(rows, row) {
  if (!row) return [];
  return rows.filter(
    (candidate) =>
      isSentenceRow(candidate) && candidate.type_id === row.type_id && candidate.slot === row.slot
  );
}

/**
 * Two-step glossary lookup, mandatory per the migration spec: the same token
 * means different things in different essay types (`P1` is a positive point
 * in type 3, a problem in type 7), so a global-only lookup would be wrong.
 * @returns {string} the hint row's `text` (the token's meaning), or "" if none found
 */
export function resolveGlossaryText(rows, typeId, token) {
  const scoped = rows.find(
    (row) => isHintRow(row) && row.func === HINT_FUNC_GLOSSARY && row.type_id === typeId && row.slot === token
  );
  if (scoped) return scoped.text;

  const global = rows.find(
    (row) => isHintRow(row) && row.func === HINT_FUNC_GLOSSARY && row.type_id === GLOBAL_TYPE_ID && row.slot === token
  );
  return global ? global.text : EMPTY_STRING;
}

/**
 * Cheat sheet: hint rows with func === 'rule', grouped by type_id
 * (0 = applies to all types), each group sorted by seq.
 * @returns {{ typeId: number, rows: Task2Row[] }[]}
 */
export function getCheatSheetGroups(rows) {
  const ruleRows = rows.filter((row) => isHintRow(row) && row.func === HINT_FUNC_RULE);
  const groups = new Map();
  ruleRows.forEach((row) => {
    if (!groups.has(row.type_id)) groups.set(row.type_id, []);
    groups.get(row.type_id).push(row);
  });
  groups.forEach((groupRows) => groupRows.sort((a, b) => a.seq - b.seq));
  return [...groups.entries()]
    .sort(([typeIdA], [typeIdB]) => typeIdA - typeIdB)
    .map(([typeId, groupRows]) => ({ typeId, rows: groupRows }));
}

function escapeForRegex(text) {
  return text.replace(REGEX_SPECIAL_CHAR_RE, REGEX_ESCAPE_REPLACEMENT);
}

/**
 * Character index ranges in `text` occupied by any of the given placeholder
 * tokens. Always matched with word boundaries (trap: short tokens collide as
 * substrings, e.g. `B1` vs `B1-1`), and iterated from `blanks` rather than
 * guessed with a general-purpose regex.
 */
function buildProtectedRanges(text, tokens) {
  const ranges = [];
  tokens.filter(Boolean).forEach((token) => {
    const tokenRe = new RegExp(`\\b${escapeForRegex(token)}\\b`, "g");
    let match = tokenRe.exec(text);
    while (match !== null) {
      ranges.push([match.index, match.index + match[0].length]);
      match = tokenRe.exec(text);
    }
  });
  return ranges;
}

function isIndexInsideAnyRange(index, ranges) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

/**
 * Mask letters with underscores like the original single-string masker, but
 * leave placeholder tokens (from `blanks`) fully visible: they are slots the
 * user fills at exam time with their own content, not English words to recall.
 */
export function maskWithPlaceholders(text, blanks) {
  if (!blanks || blanks.length === 0) {
    return Array.from(text)
      .map((char) => (LETTER_RE.test(char) ? MASK_CHAR : char))
      .join(EMPTY_STRING);
  }

  const protectedRanges = buildProtectedRanges(text, blanks);
  return Array.from(text)
    .map((char, index) =>
      isIndexInsideAnyRange(index, protectedRanges) || !LETTER_RE.test(char) ? char : MASK_CHAR
    )
    .join(EMPTY_STRING);
}
