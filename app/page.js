"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LANG_TW, UI_TEXTS } from "./i18n";
import AppHeader from "./components/AppHeader";
import ArticleLibrary from "./components/ArticleLibrary";
import PracticeTabs from "./components/PracticeTabs";
import ArticleImagePanel from "./components/ArticleImagePanel";
import ComparisonPanel from "./components/ComparisonPanel";
import ComparisonLegend from "./components/ComparisonLegend";
import MultiSentenceChecklist from "./components/MultiSentenceChecklist";

const KEY_ENTER = "Enter";
const KEY_F2 = "F2";
const KEY_RETRY_SENTENCE = "1";
const KEY_PREVIOUS_SENTENCE = "[";
const EMPTY_STRING = "";
const SENTENCE_SEPARATOR = ".";
const MASK_CHAR = "_";
const WHITESPACE_RE = /\s+/g;
const LETTER_RE = /[A-Za-z]/;
const STATUS_IDLE = "idle";
const STATUS_READY_NEXT = "ready_next";
const TAG_INPUT = "INPUT";
const TAG_TEXTAREA = "TEXTAREA";
const COMPARE_OK = "ok";
const COMPARE_WRONG = "wrong";
const COMPARE_MISSING = "missing";
const COMPARE_EXTRA = "extra";
const COMPARE_BREAK = "break";
const WORD_OR_NON_WORD_RE = /[A-Za-z]+|[^A-Za-z]/g;
const WORD_ONLY_RE = /^[A-Za-z]+$/;
const TOKEN_COST_SAME = 0;
const TOKEN_COST_EDIT = 1;
const TOKEN_COST_REPLACE_HIGH = 3;
const WORD_REPLACE_ALLOWED_DISTANCE = 1;
const SCROLL_BEHAVIOR_SMOOTH = "smooth";
const SCROLL_BEHAVIOR_AUTO = "auto";
const COPY_FEEDBACK_DURATION_MS = 2000;
const SCROLL_BLOCK_START = "start";
const SCROLL_OFFSET_NONE = 0;
const NO_ACTIVE_ARTICLE_ID = null;
const ARTICLE_IMAGE_BASE_PATH = "/articles/";
const ARTICLE_IMAGE_EXTENSION = ".png";
const ARTICLE_IMAGE_PATH_OVERRIDE_MAP = {
  "dynamic-chart-same-trend-by-category": "/sample-article-chart.png",
};
const SAMPLE_ARTICLE_ID = "dynamic-chart-same-trend-by-category";
const DYNAMIC_DIFFERENT_TREND_ARTICLE_ID = "dynamic-chart-different-trend-by-year-stage";
const PIE_CHART_STABLE_ARTICLE_ID = "pie-chart-stable-structure-by-category";
const STATIC_COMPARISON_ARTICLE_ID = "static-comparison-table-bar-by-category-group";
const MAP_STATIC_ARTICLE_ID = "map-static";
const MAP_DYNAMIC_ARTICLE_ID = "map-dynamic-before-after-now-future";
const PROCESS_DIAGRAM_ARTICLE_ID = "process-diagram";
const PRACTICE_TAB_SINGLE = "single";
const PRACTICE_TAB_MULTI = "multi";
const PRACTICE_TAB_SINGLE_BUTTON_ID = "practice-tab-single-button";
const PRACTICE_TAB_MULTI_BUTTON_ID = "practice-tab-multi-button";
const PRACTICE_TAB_SINGLE_PANEL_ID = "practice-tab-single-panel";
const PRACTICE_TAB_MULTI_PANEL_ID = "practice-tab-multi-panel";
const SENTENCE_PREVIEW_MAX_LENGTH = 70;
const SAMPLE_ARTICLE = `The line graph illustrates energy consumption in the United States by six different fuel sources between 1980 and 2030, measured in quadrillion units.

Overall, petrol and oil remain by far the dominant source throughout the period, and their usage is expected to continue rising. Coal and natural gas form the second tier, with coal projected to overtake natural gas after 2015. By contrast, nuclear, solar/wind, and hydropower contribute relatively small proportions and show only modest changes.

In 1980, petrol and oil consumption stood at around 35 quadrillion units, significantly higher than other fuels. Although there was a slight decline in the mid-1980s, it then increased steadily, reaching approximately 40 units in 2005 and is forecast to climb to nearly 50 units by 2030.

Coal and natural gas displayed similar levels at the beginning, at about 16 and 20 units respectively. Natural gas fluctuated over time and is predicted to stabilize at around 25 units from 2015 onwards. Meanwhile, coal consumption rose gradually and is expected to surpass natural gas, reaching roughly 30 units by 2030.

The remaining energy sources were used far less. Nuclear energy increased slightly from about 4 to around 7 units, while solar and wind are projected to grow steadily to approximately 6 units. In contrast, hydropower remains relatively stable at just above 3 units throughout the period.`;
const DYNAMIC_DIFFERENT_TREND_ARTICLE = `The line graph compares the proportion of people aged 65 and over in Japan, Sweden and the USA between 1940 and 2040.

Overall, all three countries show an upward trend in the percentage of elderly people. However, Japan is expected to experience the most dramatic growth and will overtake both Sweden and the USA by 2040, despite having the lowest figures for much of the period.

In 1940, the USA had the highest proportion of older people at around 9%, followed by Sweden at approximately 7%, while Japan had the lowest figure at about 5%. Over the next five decades, the percentages in the USA and Sweden increased steadily, reaching roughly 15% and 14% respectively by 1990. In contrast, Japan saw a decline to around 3% and remained at a relatively low level until the late 20th century.

After 2000, Sweden's elderly population rose significantly, peaking at about 20% around 2010 before experiencing a slight dip. Meanwhile, the USA showed a more gradual increase. Japan, however, is projected to rise sharply after 2020, climbing from around 10% to approximately 27% by 2040, making it the country with the highest proportion of elderly people.`;
const PRACTICE_ARTICLE_LIBRARY = {
  [SAMPLE_ARTICLE_ID]: {
    text: SAMPLE_ARTICLE,
  },
  [DYNAMIC_DIFFERENT_TREND_ARTICLE_ID]: {
    text: DYNAMIC_DIFFERENT_TREND_ARTICLE,
  },
};
const PRACTICE_ARTICLE_BUTTON_CONFIGS = [
  { id: SAMPLE_ARTICLE_ID, isEnabled: true },
  { id: DYNAMIC_DIFFERENT_TREND_ARTICLE_ID, isEnabled: true },
  { id: PIE_CHART_STABLE_ARTICLE_ID, isEnabled: false },
  { id: STATIC_COMPARISON_ARTICLE_ID, isEnabled: false },
  { id: MAP_STATIC_ARTICLE_ID, isEnabled: false },
  { id: MAP_DYNAMIC_ARTICLE_ID, isEnabled: false },
  { id: PROCESS_DIAGRAM_ARTICLE_ID, isEnabled: false },
];

const HIGHLIGHT_DOT_CHAR = "\u00B7";
const HIGHLIGHT_LETTER_GLOBAL_RE = /[A-Za-z]/g;

const ARTICLE_HIGHLIGHT_PHRASES = {
  [DYNAMIC_DIFFERENT_TREND_ARTICLE_ID]: [
    // 第一段（Intro）觸發詞與結構
    "The line graph compares",
    "the proportion of people aged 65 and over",
    "Japan, Sweden and the USA",
    "between 1940 and 2040",
    // 第二段（Overview）觸發詞與核心詞彙
    "Overall",
    "all three countries",
    "an upward trend",
    "However",
    "Japan is expected to experience the most dramatic growth",
    "overtake both Sweden and the USA by 2040",
    "the lowest figures for much of the period",
    // 第三段（Body 1）觸發詞、資料與核心詞彙
    "In 1940",
    "the highest proportion",
    "9%",
    "7%",
    "the lowest figure",
    "5%",
    "Over the next five decades",
    "increased steadily",
    "15% and 14% respectively by 1990",
    "In contrast",
    "saw a decline",
    "around 3%",
    "remained at a relatively low level",
    "the late 20th century",
    // 第四段（Body 2）觸發詞、資料與核心詞彙
    "After 2000",
    "rose significantly",
    "peaking at about 20%",
    "around 2010",
    "a slight dip",
    "Meanwhile",
    "a more gradual increase",
    "Japan, however",
    "is projected to rise sharply after 2020",
    "climbing from around 10% to approximately 27% by 2040",
    "the highest proportion of elderly people",
  ],
};

function normalizeSpaces(text) {
  if (typeof text !== "string") {
    return EMPTY_STRING;
  }
  return text.replace(WHITESPACE_RE, " ").trim();
}

function splitSentences(text) {
  const normalized = normalizeSpaces(text);
  if (!normalized) return [];

  return normalized
    .split(SENTENCE_SEPARATOR)
    .map((part) => normalizeSpaces(part))
    .filter((part) => part.length > 0)
    .map((part) => part + SENTENCE_SEPARATOR);
}

function maskSentence(sentence) {
  return Array.from(sentence)
    .map((char) => (LETTER_RE.test(char) ? MASK_CHAR : char))
    .join(EMPTY_STRING);
}

function truncatePreview(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function splitCompareUnits(text) {
  const units = text.match(WORD_OR_NON_WORD_RE);
  return units ?? [];
}

function isWordUnit(unitText) {
  return WORD_ONLY_RE.test(unitText);
}

function buildEditDistanceTable(expectedChars, actualChars) {
  const expectedLength = expectedChars.length;
  const actualLength = actualChars.length;
  const table = Array.from({ length: expectedLength + 1 }, () => Array(actualLength + 1).fill(0));

  for (let row = 0; row <= expectedLength; row += 1) {
    table[row][0] = row;
  }
  for (let column = 0; column <= actualLength; column += 1) {
    table[0][column] = column;
  }

  for (let row = 1; row <= expectedLength; row += 1) {
    for (let column = 1; column <= actualLength; column += 1) {
      const isSameChar = expectedChars[row - 1] === actualChars[column - 1];
      const substitutionCost = isSameChar ? TOKEN_COST_SAME : TOKEN_COST_EDIT;
      const substitution = table[row - 1][column - 1] + substitutionCost;
      const deletion = table[row - 1][column] + TOKEN_COST_EDIT;
      const insertion = table[row][column - 1] + TOKEN_COST_EDIT;
      table[row][column] = Math.min(substitution, deletion, insertion);
    }
  }

  return table;
}

function getWordUnitDistance(expectedWord, actualWord) {
  const expectedChars = Array.from(expectedWord);
  const actualChars = Array.from(actualWord);
  const table = buildEditDistanceTable(expectedChars, actualChars);
  return table[expectedChars.length][actualChars.length];
}

function compareWordOrSymbolUnit(expectedText, actualText, keyPrefix) {
  const expectedChars = Array.from(expectedText);
  const actualChars = Array.from(actualText);
  const table = buildEditDistanceTable(expectedChars, actualChars);
  const unitTokens = [];
  let row = expectedChars.length;
  let column = actualChars.length;

  while (row > 0 || column > 0) {
    if (
      row > 0 &&
      column > 0 &&
      table[row][column] ===
        table[row - 1][column - 1] +
          (expectedChars[row - 1] === actualChars[column - 1] ? TOKEN_COST_SAME : TOKEN_COST_EDIT)
    ) {
      const isSameChar = expectedChars[row - 1] === actualChars[column - 1];
      unitTokens.push({
        key: `${keyPrefix}-${isSameChar ? COMPARE_OK : COMPARE_WRONG}-${row}-${column}`,
        status: isSameChar ? COMPARE_OK : COMPARE_WRONG,
        expectedChar: expectedChars[row - 1],
        actualChar: actualChars[column - 1],
      });
      row -= 1;
      column -= 1;
      continue;
    }

    if (row > 0 && table[row][column] === table[row - 1][column] + TOKEN_COST_EDIT) {
      unitTokens.push({
        key: `${keyPrefix}-${COMPARE_MISSING}-${row}-${column}`,
        status: COMPARE_MISSING,
        expectedChar: expectedChars[row - 1],
        actualChar: EMPTY_STRING,
      });
      row -= 1;
      continue;
    }

    unitTokens.push({
      key: `${keyPrefix}-${COMPARE_EXTRA}-${row}-${column}`,
      status: COMPARE_EXTRA,
      expectedChar: EMPTY_STRING,
      actualChar: actualChars[column - 1],
    });
    column -= 1;
  }

  unitTokens.reverse();
  return unitTokens;
}

function compareSingleSentence(target, input) {
  const targetUnits = splitCompareUnits(target);
  const inputUnits = splitCompareUnits(input);
  const targetLength = targetUnits.length;
  const inputLength = inputUnits.length;
  const distanceTable = Array.from({ length: targetLength + 1 }, () =>
    Array(inputLength + 1).fill(0)
  );
  const tokens = [];
  let tokenIndex = 0;

  for (let row = 0; row <= targetLength; row += 1) {
    distanceTable[row][0] = row;
  }
  for (let column = 0; column <= inputLength; column += 1) {
    distanceTable[0][column] = column;
  }

  function getReplaceCost(expectedUnit, actualUnit) {
    if (expectedUnit === actualUnit) return TOKEN_COST_SAME;

    const isWordPair = isWordUnit(expectedUnit) && isWordUnit(actualUnit);
    if (!isWordPair) return TOKEN_COST_REPLACE_HIGH;

    const wordDistance = getWordUnitDistance(expectedUnit, actualUnit);
    if (wordDistance <= WORD_REPLACE_ALLOWED_DISTANCE) {
      return TOKEN_COST_EDIT;
    }

    return TOKEN_COST_REPLACE_HIGH;
  }

  for (let row = 1; row <= targetLength; row += 1) {
    for (let column = 1; column <= inputLength; column += 1) {
      const replaceCost = getReplaceCost(targetUnits[row - 1], inputUnits[column - 1]);
      const substitution = distanceTable[row - 1][column - 1] + replaceCost;
      const deletion = distanceTable[row - 1][column] + TOKEN_COST_EDIT;
      const insertion = distanceTable[row][column - 1] + TOKEN_COST_EDIT;
      distanceTable[row][column] = Math.min(substitution, deletion, insertion);
    }
  }

  function pushCharsAsStatus(status, expectedUnit, actualUnit, keyPrefix) {
    if (status === COMPARE_OK || status === COMPARE_WRONG) {
      const comparedTokens = compareWordOrSymbolUnit(expectedUnit, actualUnit, keyPrefix);
      for (let index = comparedTokens.length - 1; index >= 0; index -= 1) {
        const token = comparedTokens[index];
        tokens.push({
          ...token,
          key: `${token.key}-${tokenIndex}`,
        });
        tokenIndex += 1;
      }
      return;
    }

    const sourceChars = Array.from(status === COMPARE_MISSING ? expectedUnit : actualUnit);
    for (let unitCharIndex = sourceChars.length - 1; unitCharIndex >= 0; unitCharIndex -= 1) {
      const charValue = sourceChars[unitCharIndex];
      tokens.push({
        key: `${keyPrefix}-${unitCharIndex}-${tokenIndex}`,
        status,
        expectedChar: status === COMPARE_MISSING ? charValue : EMPTY_STRING,
        actualChar: status === COMPARE_EXTRA ? charValue : EMPTY_STRING,
      });
      tokenIndex += 1;
    }
  }

  let row = targetLength;
  let column = inputLength;
  while (row > 0 || column > 0) {
    const expectedUnit = targetUnits[row - 1];
    const actualUnit = inputUnits[column - 1];

    if (
      row > 0 &&
      column > 0 &&
      distanceTable[row][column] ===
        distanceTable[row - 1][column - 1] + getReplaceCost(expectedUnit, actualUnit)
    ) {
      const isSameUnit = expectedUnit === actualUnit;
      pushCharsAsStatus(
        isSameUnit ? COMPARE_OK : COMPARE_WRONG,
        expectedUnit,
        actualUnit,
        `unit-${row - 1}-${column - 1}`
      );
      row -= 1;
      column -= 1;
      continue;
    }

    if (row > 0 && distanceTable[row][column] === distanceTable[row - 1][column] + TOKEN_COST_EDIT) {
      pushCharsAsStatus(COMPARE_MISSING, expectedUnit, EMPTY_STRING, `missing-${row - 1}-${column}`);
      row -= 1;
      continue;
    }

    pushCharsAsStatus(COMPARE_EXTRA, EMPTY_STRING, actualUnit, `extra-${row}-${column - 1}`);
    column -= 1;
  }

  tokens.reverse();
  const wrongCount = tokens.filter((token) => token.status !== COMPARE_OK).length;

  return {
    isCorrect: wrongCount === 0,
    wrongCount,
    tokens,
  };
}

function compareAnswer(target, input) {
  const targetSentences = splitSentences(target);
  const inputSentences = splitSentences(input);
  const sentenceCount = Math.max(targetSentences.length, inputSentences.length);
  const mergedTokens = [];
  let totalWrongCount = 0;

  for (let sentenceIndex = 0; sentenceIndex < sentenceCount; sentenceIndex += 1) {
    const targetSentence = targetSentences[sentenceIndex] ?? EMPTY_STRING;
    const inputSentence = inputSentences[sentenceIndex] ?? EMPTY_STRING;
    const sentenceResult = compareSingleSentence(targetSentence, inputSentence);

    totalWrongCount += sentenceResult.wrongCount;
    sentenceResult.tokens.forEach((token, tokenIndex) => {
      mergedTokens.push({
        ...token,
        key: `s${sentenceIndex}-${tokenIndex}-${token.key}`,
      });
    });

    const hasNextSentence = sentenceIndex < sentenceCount - 1;
    if (hasNextSentence) {
      mergedTokens.push({
        key: `s${sentenceIndex}-break`,
        status: COMPARE_BREAK,
        expectedChar: "\n",
        actualChar: "\n",
      });
    }
  }

  return {
    isCorrect: totalWrongCount === 0,
    wrongCount: totalWrongCount,
    tokens: mergedTokens,
  };
}

function isTypingElement(element) {
  if (!element) return false;
  const tagName = element.tagName;
  const isEditable = element.isContentEditable;
  return tagName === TAG_INPUT || tagName === TAG_TEXTAREA || isEditable;
}

function buildHighlightSegments(text, phrases) {
  const matches = [];
  for (const phrase of phrases) {
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const index = text.indexOf(phrase, searchFrom);
      if (index === -1) break;
      matches.push({ start: index, end: index + phrase.length });
      searchFrom = index + 1;
    }
  }

  matches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  const resolvedMatches = [];
  for (const match of matches) {
    const lastResolved = resolvedMatches[resolvedMatches.length - 1];
    if (!lastResolved || match.start >= lastResolved.end) {
      resolvedMatches.push(match);
    }
  }

  const segments = [];
  let cursor = 0;
  for (const match of resolvedMatches) {
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), isHighlighted: false });
    }
    segments.push({ text: text.slice(match.start, match.end), isHighlighted: true });
    cursor = match.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isHighlighted: false });
  }

  return segments;
}

function replaceLettersWithDots(text) {
  return text.replace(HIGHLIGHT_LETTER_GLOBAL_RE, HIGHLIGHT_DOT_CHAR);
}

const SEGMENT_TYPE_WORD = "word";
const SEGMENT_TYPE_SEPARATOR = "separator";
const SEGMENT_TYPE_BREAK = "break";

function isTokenWordChar(token) {
  const actual = token.actualChar;
  const expected = token.expectedChar;
  const hasActual = actual !== EMPTY_STRING;
  const hasExpected = expected !== EMPTY_STRING;

  if (hasActual && hasExpected) {
    return LETTER_RE.test(actual) && LETTER_RE.test(expected);
  }

  const char = actual || expected;
  return LETTER_RE.test(char);
}

function groupTokensIntoWordSegments(tokens) {
  const segments = [];
  let pendingWordTokens = [];

  function flushPendingWord() {
    if (pendingWordTokens.length === 0) return;

    let actualText = EMPTY_STRING;
    let expectedText = EMPTY_STRING;
    let hasError = false;

    for (const t of pendingWordTokens) {
      actualText += t.actualChar;
      expectedText += t.expectedChar;
      if (t.status !== COMPARE_OK) {
        hasError = true;
      }
    }

    segments.push({
      type: SEGMENT_TYPE_WORD,
      actualText,
      expectedText,
      hasError,
    });
    pendingWordTokens = [];
  }

  for (const token of tokens) {
    if (token.status === COMPARE_BREAK) {
      flushPendingWord();
      segments.push({ type: SEGMENT_TYPE_BREAK });
      continue;
    }

    if (isTokenWordChar(token)) {
      pendingWordTokens.push(token);
    } else {
      flushPendingWord();
      segments.push({
        type: SEGMENT_TYPE_SEPARATOR,
        actualText: token.actualChar,
        expectedText: token.expectedChar,
        hasError: token.status !== COMPARE_OK,
      });
    }
  }

  flushPendingWord();
  return segments;
}

export default function HomePage() {
  const [language, setLanguage] = useState(LANG_TW);
  const t = UI_TEXTS[language];
  const [sentences, setSentences] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState(EMPTY_STRING);
  const [resultStatus, setResultStatus] = useState(EMPTY_STRING);
  const [comparisonTokens, setComparisonTokens] = useState([]);
  const [practiceStatus, setPracticeStatus] = useState(STATUS_IDLE);
  const [sentenceStatus, setSentenceStatus] = useState(UI_TEXTS[LANG_TW].selectArticleFirst);
  const [maskedSentence, setMaskedSentence] = useState(UI_TEXTS[LANG_TW].idleMask);
  const [showHintMask, setShowHintMask] = useState(true);
  const [activePracticeTab, setActivePracticeTab] = useState(PRACTICE_TAB_SINGLE);
  const [isMultiPracticeStarted, setIsMultiPracticeStarted] = useState(false);
  const [isMultiSelectorExpanded, setIsMultiSelectorExpanded] = useState(true);
  const [isSingleSelectorExpanded, setIsSingleSelectorExpanded] = useState(true);
  const [selectedSentenceMap, setSelectedSentenceMap] = useState({});
  const [multiTargetText, setMultiTargetText] = useState(EMPTY_STRING);
  const [multiAnswerInput, setMultiAnswerInput] = useState(EMPTY_STRING);
  const [multiSelectionStatus, setMultiSelectionStatus] = useState(EMPTY_STRING);
  const [activeArticleId, setActiveArticleId] = useState(NO_ACTIVE_ARTICLE_ID);
  const [isActiveArticleImageUnavailable, setIsActiveArticleImageUnavailable] = useState(false);
  const [isArticleTextExpanded, setIsArticleTextExpanded] = useState(true);
  const [isComparisonExpanded, setIsComparisonExpanded] = useState(false);
  const [isReferenceCollapsed, setIsReferenceCollapsed] = useState(true);
  const [isArticleTextCopied, setIsArticleTextCopied] = useState(false);
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const [isSkeletonActive, setIsSkeletonActive] = useState(false);

  const answerInputRef = useRef(null);
  const multiAnswerInputRef = useRef(null);
  const comparisonPanelRef = useRef(null);
  const singleSelectorToggleButtonRef = useRef(null);
  const multiSelectorToggleButtonRef = useRef(null);

  const hasSentence = useMemo(
    () => (sentences[currentIndex] ?? EMPTY_STRING).length > 0,
    [currentIndex, sentences]
  );
  const activeArticleText = useMemo(() => {
    if (!activeArticleId) return EMPTY_STRING;
    return PRACTICE_ARTICLE_LIBRARY[activeArticleId]?.text ?? EMPTY_STRING;
  }, [activeArticleId]);
  const sourceSentenceList = useMemo(() => splitSentences(activeArticleText), [activeArticleText]);
  const hasActiveArticle = activeArticleId !== NO_ACTIVE_ARTICLE_ID;
  const activeArticleImageUrl = useMemo(() => {
    if (!activeArticleId) return EMPTY_STRING;
    const overridePath = ARTICLE_IMAGE_PATH_OVERRIDE_MAP[activeArticleId];
    if (overridePath) return overridePath;
    return `${ARTICLE_IMAGE_BASE_PATH}${activeArticleId}${ARTICLE_IMAGE_EXTENSION}`;
  }, [activeArticleId]);
  const highlightPhrases = useMemo(() => {
    if (!activeArticleId) return [];
    return ARTICLE_HIGHLIGHT_PHRASES[activeArticleId] ?? [];
  }, [activeArticleId]);
  const hasHighlightPhrases = highlightPhrases.length > 0;

  const highlightedArticleContent = useMemo(() => {
    if (!activeArticleText || highlightPhrases.length === 0) return activeArticleText;
    if (!isHighlightActive && !isSkeletonActive) return activeArticleText;

    const segments = buildHighlightSegments(activeArticleText, highlightPhrases);
    return segments.map((segment, index) => {
      if (segment.isHighlighted) {
        return <mark key={index} className="highlight-keyword">{segment.text}</mark>;
      }
      if (isSkeletonActive) {
        return <span key={index} className="highlight-faded">{replaceLettersWithDots(segment.text)}</span>;
      }
      return segment.text;
    });
  }, [activeArticleText, highlightPhrases, isHighlightActive, isSkeletonActive]);

  const isSinglePracticeTab = activePracticeTab === PRACTICE_TAB_SINGLE;
  const isMultiPracticeTab = activePracticeTab === PRACTICE_TAB_MULTI;
  const currentSentencePreview = useMemo(() => {
    const sentence = sentences[currentIndex] ?? EMPTY_STRING;
    if (isReferenceCollapsed) {
      const wordCount = sentence.split(WHITESPACE_RE).filter(Boolean).length;
      return `${t.sentenceLabel} ${currentIndex + 1}（${wordCount} ${t.words}）`;
    }
    return truncatePreview(sentence, SENTENCE_PREVIEW_MAX_LENGTH);
  }, [sentences, currentIndex, isReferenceCollapsed, t]);

  function getArticleLabel(articleId) {
    return t.articleLabelMap[articleId] ?? articleId;
  }

  function getCurrentSentence() {
    return sentences[currentIndex] ?? EMPTY_STRING;
  }

  function clearAnswerArea() {
    setAnswerInput(EMPTY_STRING);
    setResultStatus(EMPTY_STRING);
    setComparisonTokens([]);
    setPracticeStatus(STATUS_IDLE);
    setIsComparisonExpanded(false);
  }

  function focusAnswerInput() {
    const answerInputElement = answerInputRef.current;
    if (!answerInputElement) return;
    answerInputElement.focus({ preventScroll: true });
  }

  function blurAnswerInput() {
    answerInputRef.current?.blur();
  }

  function renderCurrentSentence(nextSentences, nextIndex) {
    const sentence = nextSentences[nextIndex] ?? EMPTY_STRING;
    const sentenceCount = nextSentences.length;

    if (!sentence) {
      setSentenceStatus(t.noSentence);
      setMaskedSentence(t.idleMask);
      return;
    }

    const displayIndex = nextIndex + 1;
    setSentenceStatus(t.formatSentenceProgress(displayIndex, sentenceCount));
    setMaskedSentence(maskSentence(sentence));
  }

  function startPractice(articleText) {
    const nextSentences = splitSentences(articleText);
    if (nextSentences.length === 0) {
      setSentenceStatus(t.noDot);
      setMaskedSentence(t.idleMask);
      return;
    }

    const FIRST_INDEX = 0;
    setSentences(nextSentences);
    setCurrentIndex(FIRST_INDEX);
    clearAnswerArea();
    renderCurrentSentence(nextSentences, FIRST_INDEX);
    focusAnswerInput();
  }

  function loadArticleAndStartPractice(articleId) {
    const targetArticle = PRACTICE_ARTICLE_LIBRARY[articleId];
    if (!targetArticle) return;

    setActiveArticleId(articleId);
    startPractice(targetArticle.text);
  }

  function handleArticleSelection(articleId) {
    loadArticleAndStartPractice(articleId);
  }

  function toggleSentenceSelection(index) {
    setSelectedSentenceMap((previousMap) => ({
      ...previousMap,
      [index]: !previousMap[index],
    }));
  }

  function toggleSelectAllSentences() {
    const allSelected = sourceSentenceList.length > 0 &&
      sourceSentenceList.every((_sentence, index) => selectedSentenceMap[index]);
    if (allSelected) {
      setSelectedSentenceMap({});
    } else {
      const nextMap = {};
      sourceSentenceList.forEach((_sentence, index) => {
        nextMap[index] = true;
      });
      setSelectedSentenceMap(nextMap);
    }
  }

  const isAllSentencesSelected = useMemo(
    () => sourceSentenceList.length > 0 &&
      sourceSentenceList.every((_sentence, index) => selectedSentenceMap[index]),
    [sourceSentenceList, selectedSentenceMap]
  );

  function toggleArticleTextExpanded() {
    setIsArticleTextExpanded((previousValue) => !previousValue);
  }

  function copyArticleTextToClipboard() {
    if (!activeArticleText) return;
    navigator.clipboard.writeText(activeArticleText).then(() => {
      setIsArticleTextCopied(true);
      setTimeout(() => setIsArticleTextCopied(false), COPY_FEEDBACK_DURATION_MS);
    });
  }

  function startMultiPracticeBySelection() {
    const selectedSentences = sourceSentenceList.filter((sentence, index) => selectedSentenceMap[index]);
    if (selectedSentences.length === 0) {
      setMultiSelectionStatus(t.selectSentenceFirst);
      return;
    }

    const combinedSentenceText = normalizeSpaces(selectedSentences.join(" "));
    setMultiTargetText(combinedSentenceText);
    setMultiAnswerInput(EMPTY_STRING);
    setSentenceStatus(t.formatMultiSentenceProgress(selectedSentences.length));
    setMaskedSentence(maskSentence(combinedSentenceText));
    setResultStatus(EMPTY_STRING);
    setMultiSelectionStatus(EMPTY_STRING);
    setComparisonTokens([]);
    setPracticeStatus(STATUS_IDLE);
    setIsMultiPracticeStarted(true);
    setIsMultiSelectorExpanded(false);
    setIsComparisonExpanded(false);
    requestAnimationFrame(() => {
      multiAnswerInputRef.current?.focus();
    });
  }

  function toggleMultiSelectorPanel() {
    togglePanelAndKeepViewport(setIsMultiSelectorExpanded, multiSelectorToggleButtonRef);
  }

  function toggleSingleSelectorPanel() {
    togglePanelAndKeepViewport(setIsSingleSelectorExpanded, singleSelectorToggleButtonRef);
  }

  function togglePanelAndKeepViewport(setExpandedState, toggleButtonRef) {
    const toggleButtonElement = toggleButtonRef.current;
    const buttonTopBeforeToggle = toggleButtonElement?.getBoundingClientRect().top;
    const scrollYBeforeToggle = window.scrollY;
    const scrollXBeforeToggle = window.scrollX;

    setExpandedState((previousValue) => !previousValue);

    requestAnimationFrame(() => {
      const buttonTopAfterToggle = toggleButtonElement?.getBoundingClientRect().top;
      const hasButtonTopData =
        typeof buttonTopBeforeToggle === "number" && typeof buttonTopAfterToggle === "number";

      if (hasButtonTopData) {
        const verticalOffset = buttonTopAfterToggle - buttonTopBeforeToggle;
        if (verticalOffset !== SCROLL_OFFSET_NONE) {
          window.scrollBy({
            top: verticalOffset,
            left: SCROLL_OFFSET_NONE,
            behavior: SCROLL_BEHAVIOR_AUTO,
          });
        }
        return;
      }

      window.scrollTo({
        top: scrollYBeforeToggle,
        left: scrollXBeforeToggle,
        behavior: SCROLL_BEHAVIOR_AUTO,
      });
    });
  }

  function goToSentenceByIndex(targetIndex) {
    if (targetIndex < 0 || targetIndex >= sentences.length) return;
    setCurrentIndex(targetIndex);
    clearAnswerArea();
    renderCurrentSentence(sentences, targetIndex);
    focusAnswerInput();
  }

  function scrollToPracticeResultArea() {
    requestAnimationFrame(() => {
      comparisonPanelRef.current?.scrollIntoView({
        behavior: SCROLL_BEHAVIOR_SMOOTH,
        block: SCROLL_BLOCK_START,
      });
    });
  }

  function checkCurrentAnswer() {
    if (!hasSentence) return;

    const target = getCurrentSentence();
    const normalizedInput = normalizeSpaces(answerInput);
    const result = compareAnswer(target, normalizedInput);

    if (result.isCorrect) {
      setResultStatus(t.correctAndNextHint);
    } else {
      const targetLength = Array.from(target).length;
      const accuracyPercent = Math.round(
        ((targetLength - result.wrongCount) / targetLength) * 100
      );
      setResultStatus(t.formatSingleWrongResult(result.wrongCount, accuracyPercent));
    }

    setComparisonTokens(result.tokens);
    setPracticeStatus(STATUS_READY_NEXT);
    setIsComparisonExpanded(true);
    blurAnswerInput();
    scrollToPracticeResultArea();
  }

  function checkMultiAnswer() {
    if (!isMultiPracticeStarted || !multiTargetText) return;

    const normalizedInput = normalizeSpaces(multiAnswerInput);
    const result = compareAnswer(multiTargetText, normalizedInput);
    if (result.isCorrect) {
      setResultStatus(t.multiPassed);
    } else {
      const targetLength = Array.from(multiTargetText).length;
      const accuracyPercent = Math.round(
        ((targetLength - result.wrongCount) / targetLength) * 100
      );
      setResultStatus(t.formatMultiWrongResult(result.wrongCount, accuracyPercent));
    }

    setComparisonTokens(result.tokens);
    setPracticeStatus(STATUS_IDLE);
    setIsComparisonExpanded(true);
    scrollToPracticeResultArea();
  }

  function retryCurrentSentence() {
    clearAnswerArea();
    focusAnswerInput();
  }

  function retryMultiPractice() {
    setMultiAnswerInput(EMPTY_STRING);
    setResultStatus(EMPTY_STRING);
    setComparisonTokens([]);
    setPracticeStatus(STATUS_IDLE);
    setIsComparisonExpanded(false);
    multiAnswerInputRef.current?.focus();
  }

  function goToNextSentence() {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= sentences.length) {
      setResultStatus(t.lastSentence);
      setPracticeStatus(STATUS_IDLE);
      return;
    }

    setCurrentIndex(nextIndex);
    clearAnswerArea();
    renderCurrentSentence(sentences, nextIndex);
    focusAnswerInput();
  }

  function goToPreviousSentence() {
    const previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      setResultStatus(t.firstSentence);
      setPracticeStatus(STATUS_IDLE);
      return;
    }

    setCurrentIndex(previousIndex);
    clearAnswerArea();
    renderCurrentSentence(sentences, previousIndex);
    focusAnswerInput();
  }

  useEffect(() => {
    function onGlobalKeyDown(event) {
      if (event.key === KEY_F2) {
        event.preventDefault();
        setShowHintMask((previousValue) => !previousValue);
        return;
      }

      if (isTypingElement(document.activeElement)) {
        return;
      }

      if (isSinglePracticeTab) {
        if (!hasSentence) return;

        if (event.key === KEY_PREVIOUS_SENTENCE) {
          event.preventDefault();
          goToPreviousSentence();
          return;
        }

        if (practiceStatus === STATUS_READY_NEXT && event.key === KEY_ENTER) {
          event.preventDefault();
          goToNextSentence();
          return;
        }

        if (event.key === KEY_RETRY_SENTENCE) {
          event.preventDefault();
          retryCurrentSentence();
        }
        return;
      }

      if (isMultiPracticeTab && isMultiPracticeStarted && event.key === KEY_RETRY_SENTENCE) {
        event.preventDefault();
        retryMultiPractice();
      }
    }

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", onGlobalKeyDown);
    };
  }, [practiceStatus, currentIndex, sentences, hasSentence, isSinglePracticeTab, isMultiPracticeTab, isMultiPracticeStarted]);

  useEffect(() => {
    setSelectedSentenceMap({});
    setIsMultiPracticeStarted(false);
    setIsMultiSelectorExpanded(true);
    setIsSingleSelectorExpanded(true);
    setMultiTargetText(EMPTY_STRING);
    setMultiAnswerInput(EMPTY_STRING);
    setMultiSelectionStatus(EMPTY_STRING);
    setIsActiveArticleImageUnavailable(false);
    setIsArticleTextExpanded(true);
    setIsComparisonExpanded(false);
  }, [activeArticleId]);

  useEffect(() => {
    if (isMultiPracticeTab && isMultiPracticeStarted) {
      const selectedSentenceCount = sourceSentenceList.filter(
        (sentence, index) => selectedSentenceMap[index] && sentence
      ).length;
      setSentenceStatus(t.formatMultiSentenceProgress(selectedSentenceCount));
      if (multiTargetText) {
        setMaskedSentence(maskSentence(multiTargetText));
      }
      return;
    }

    if (sentences.length > 0) {
      renderCurrentSentence(sentences, currentIndex);
      return;
    }

    if (!hasActiveArticle) {
      setSentenceStatus(t.selectArticleFirst);
      setMaskedSentence(t.idleMask);
      return;
    }

    setSentenceStatus(t.idleStatus);
    setMaskedSentence(t.idleMask);
  }, [
    hasActiveArticle,
    language,
    isMultiPracticeTab,
    isMultiPracticeStarted,
    sourceSentenceList,
    selectedSentenceMap,
    multiTargetText,
    sentences,
    currentIndex,
    t,
  ]);

  const unifiedSegments = useMemo(
    () => groupTokensIntoWordSegments(comparisonTokens),
    [comparisonTokens]
  );
  const legendItems = useMemo(
    () => [
      { id: "deletion", dotClassName: "legend-dot--deletion", label: t.legendDeletion },
      { id: "insertion", dotClassName: "legend-dot--insertion", label: t.legendInsertion },
    ],
    [t]
  );
  const activeArticleLabel = hasActiveArticle ? getArticleLabel(activeArticleId) : EMPTY_STRING;

  function renderComparisonResult() {
    const hasResult = comparisonTokens.length > 0;
    return (
      <section className="result-review-panel" aria-label={t.resultReviewTitle}>
        <h3 className="result-review-title">{t.resultReviewTitle}</h3>
        {hasResult ? (
          <>
            <div className="result-summary">
              <span>{resultStatus}</span>
              <button
                className="btn-ghost compact"
                onClick={() => setIsComparisonExpanded((prev) => !prev)}
              >
                {isComparisonExpanded ? t.collapseComparison : t.expandComparison}
              </button>
            </div>
            {isComparisonExpanded && (
              <>
                <ComparisonPanel
                  panelRef={comparisonPanelRef}
                  segments={unifiedSegments}
                />
                <ComparisonLegend legendItems={legendItems} />
              </>
            )}
          </>
        ) : (
          <div className="comparison-empty-state">{t.comparisonEmptyHint}</div>
        )}
      </section>
    );
  }

  function renderSentencePills() {
    if (sentences.length === 0) return null;
    return (
      <>
        <div className="sentence-pill-bar">
          {sentences.map((sentence, index) => {
            const isActiveSentence = index === currentIndex;
            const displayIndex = index + 1;
            return (
              <button
                key={`pill-${index}`}
                className={`sentence-pill ${isActiveSentence ? "active" : EMPTY_STRING}`}
                onClick={() => goToSentenceByIndex(index)}
                aria-pressed={isActiveSentence}
                aria-label={t.formatSingleSentenceLabel(displayIndex)}
              >
                {displayIndex}
              </button>
            );
          })}
        </div>
        <div className="sentence-preview">{currentSentencePreview}</div>
      </>
    );
  }

  function renderReferenceColumn() {
    return (
      <div className="reference-column">
        {hasActiveArticle && (
          <section className="article-text-panel" aria-label={t.articleTextTitle}>
            <div className="article-text-header">
              <div className="article-text-title">{t.articleTextTitle}</div>
              <div className="article-text-actions">
                <button className="btn-ghost compact" onClick={toggleArticleTextExpanded}>
                  {isArticleTextExpanded ? t.collapseArticleText : t.expandArticleText}
                </button>
              </div>
            </div>
            <div
              className={`article-text-collapse ${isArticleTextExpanded ? "expanded" : EMPTY_STRING}`}
            >
              <div className="article-text-block">
                <div className="article-text-toolbar">
                  {hasHighlightPhrases && (
                    <>
                      <button
                        className={`article-text-highlight-btn ${isHighlightActive ? "active" : EMPTY_STRING}`}
                        onClick={() => setIsHighlightActive((prev) => !prev)}
                      >
                        {isHighlightActive ? t.removeHighlight : t.highlightKeywords}
                      </button>
                      <button
                        className={`article-text-highlight-btn ${isSkeletonActive ? "active" : EMPTY_STRING}`}
                        onClick={() => setIsSkeletonActive((prev) => !prev)}
                      >
                        {isSkeletonActive ? t.hideSkeleton : t.showSkeleton}
                      </button>
                    </>
                  )}
                  <button
                    className="article-text-copy-btn"
                    onClick={copyArticleTextToClipboard}
                    aria-label={t.copyArticleText}
                  >
                    {isArticleTextCopied ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {t.copiedArticleText}
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        {t.copyArticleText}
                      </>
                    )}
                  </button>
                </div>
                <pre className="article-text-content">
                  {highlightedArticleContent}
                </pre>
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  function renderPracticeColumn() {
    return (
      <div className="practice-column">
        <div className="section-heading">
          <h2 className="section-title">{t.practiceAreaTitle}</h2>
          {hasActiveArticle && (
            <button
              className="btn-ghost"
              onClick={() => setIsReferenceCollapsed((prev) => !prev)}
            >
              {isReferenceCollapsed ? t.showReference : t.hideReference}
            </button>
          )}
        </div>
        <PracticeTabs
          activePracticeTab={activePracticeTab}
          singleTabValue={PRACTICE_TAB_SINGLE}
          multiTabValue={PRACTICE_TAB_MULTI}
          singleTabLabel={t.tabSingle}
          multiTabLabel={t.tabMulti}
          onTabChange={setActivePracticeTab}
          tabAriaLabel={t.practiceTabAriaLabel}
          singleButtonId={PRACTICE_TAB_SINGLE_BUTTON_ID}
          multiButtonId={PRACTICE_TAB_MULTI_BUTTON_ID}
          singlePanelId={PRACTICE_TAB_SINGLE_PANEL_ID}
          multiPanelId={PRACTICE_TAB_MULTI_PANEL_ID}
        />

        <div
          role="tabpanel"
          id={isSinglePracticeTab ? PRACTICE_TAB_SINGLE_PANEL_ID : PRACTICE_TAB_MULTI_PANEL_ID}
          aria-labelledby={
            isSinglePracticeTab ? PRACTICE_TAB_SINGLE_BUTTON_ID : PRACTICE_TAB_MULTI_BUTTON_ID
          }
        >
          {!hasActiveArticle ? (
            <div className="practice-empty-state">{t.selectArticleFirst}</div>
          ) : isSinglePracticeTab ? (
            <>
              <div className="sentence-header">
                <div className="sentence-nav">
                  <div className="status sentence-status">{sentenceStatus}</div>
                  <button
                    ref={singleSelectorToggleButtonRef}
                    className="btn-ghost compact"
                    onClick={toggleSingleSelectorPanel}
                  >
                    {isSingleSelectorExpanded ? t.singleSelectorOpen : t.singleSelectorClosed}
                  </button>
                  <button className="btn-ghost compact" onClick={goToPreviousSentence} disabled={!hasSentence}>
                    {t.previousSentence}
                  </button>
                  <button className="btn-ghost compact" onClick={goToNextSentence} disabled={!hasSentence}>
                    {t.nextSentence}
                  </button>
                </div>
                <label className="hint-toggle">
                  <input
                    type="checkbox"
                    checked={showHintMask}
                    onChange={(event) => setShowHintMask(event.target.checked)}
                  />
                  {t.toggleHintMask}
                </label>
              </div>
              <div
                className={`single-selector-collapse ${
                  isSingleSelectorExpanded ? "expanded" : EMPTY_STRING
                }`}
              >
                {sentences.length === 0 ? (
                  <div className="single-selector-placeholder">{t.singleSelectorPlaceholder}</div>
                ) : (
                  renderSentencePills()
                )}
              </div>
              {showHintMask && <div className="masked">{maskedSentence}</div>}
              <div className="btn-row">
                <input
                  ref={answerInputRef}
                  type="text"
                  value={answerInput}
                  onChange={(event) => setAnswerInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === KEY_ENTER) {
                      event.preventDefault();
                      event.stopPropagation();
                      checkCurrentAnswer();
                    }
                  }}
                  placeholder={t.inputPlaceholderSingle}
                  disabled={!hasSentence}
                  spellCheck={false}
                />
              </div>
              <div className="btn-row">
                <button className="btn-primary" onClick={checkCurrentAnswer} disabled={!hasSentence}>
                  {t.checkAnswer}
                </button>
                <button className="btn-secondary" onClick={retryCurrentSentence} disabled={!hasSentence}>
                  {t.retryCurrentSentence}
                </button>
                <button className="btn-ghost" onClick={goToNextSentence} disabled={!hasSentence}>
                  {t.nextSentence}
                </button>
              </div>
              <div className="status">{resultStatus}</div>
              <div className="status text-caption">{t.singleShortcutHint}</div>
              {renderComparisonResult()}
            </>
          ) : isMultiPracticeStarted ? (
            <>
              <div className="sentence-header">
                <div className="sentence-nav">
                  <div className="status sentence-status">{sentenceStatus}</div>
                  <button
                    ref={multiSelectorToggleButtonRef}
                    className="btn-secondary compact"
                    onClick={toggleMultiSelectorPanel}
                  >
                    {isMultiSelectorExpanded ? t.multiSelectorOpen : t.multiSelectorClosed}
                  </button>
                </div>
                <label className="hint-toggle">
                  <input
                    type="checkbox"
                    checked={showHintMask}
                    onChange={(event) => setShowHintMask(event.target.checked)}
                  />
                  {t.toggleHintMask}
                </label>
              </div>
              <div
                className={`multi-selector-collapse ${
                  isMultiSelectorExpanded ? "expanded" : EMPTY_STRING
                }`}
              >
                <div className="multi-practice-selector">
                  <div className="status multi-practice-title">{t.multiSelectorTitle}</div>
                  <div className="btn-row">
                    <button className="btn-secondary compact" onClick={toggleSelectAllSentences}>
                      {isAllSentencesSelected ? t.deselectAll : t.selectAll}
                    </button>
                  </div>
                  <MultiSentenceChecklist
                    sentences={sourceSentenceList}
                    selectedSentenceMap={selectedSentenceMap}
                    onToggleSentence={toggleSentenceSelection}
                    itemKeyPrefix="multi-reselect"
                  />
                  <div className="btn-row">
                    <button className="btn-primary" onClick={startMultiPracticeBySelection}>{t.confirmAndStart}</button>
                  </div>
                  <div className="status">{multiSelectionStatus}</div>
                </div>
              </div>
              {showHintMask && <div className="masked">{maskedSentence}</div>}
              <div className="btn-row">
                <textarea
                  ref={multiAnswerInputRef}
                  value={multiAnswerInput}
                  onChange={(event) => setMultiAnswerInput(event.target.value)}
                  placeholder={t.inputPlaceholderMulti}
                  className="multi-answer-input"
                  spellCheck={false}
                />
              </div>
              <div className="btn-row">
                <button className="btn-primary" onClick={checkMultiAnswer}>{t.checkAnswer}</button>
                <button className="btn-secondary" onClick={retryMultiPractice}>
                  {t.retryCurrentGroup}
                </button>
              </div>
              <div className="status">{resultStatus}</div>
              <div className="status text-caption">{t.multiShortcutHint}</div>
              {renderComparisonResult()}
            </>
          ) : (
            <div className="multi-practice-selector">
              <div className="status multi-practice-title">{t.multiNotStarted}</div>
              {sourceSentenceList.length === 0 ? (
                <div className="multi-practice-placeholder">{t.multiNotStartedPlaceholder}</div>
              ) : (
                <>
                  <div className="btn-row">
                    <button className="btn-secondary compact" onClick={toggleSelectAllSentences}>
                      {isAllSentencesSelected ? t.deselectAll : t.selectAll}
                    </button>
                  </div>
                  <MultiSentenceChecklist
                    sentences={sourceSentenceList}
                    selectedSentenceMap={selectedSentenceMap}
                    onToggleSentence={toggleSentenceSelection}
                    itemKeyPrefix="multi"
                  />
                  <div className="btn-row">
                    <button className="btn-primary" onClick={startMultiPracticeBySelection}>{t.confirmAndStart}</button>
                  </div>
                  <div className="status">{multiSelectionStatus}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="container app-shell">
      <AppHeader
        title={t.appTitle}
        introHint={t.introHint}
        language={language}
        onLanguageChange={setLanguage}
        languageSwitchAria={t.languageSwitchAria}
      />
      <section className="card">
        <ArticleLibrary
          title={t.articleLibraryTitle}
          subtitle={t.articleLibrarySubtitle}
          articleConfigs={PRACTICE_ARTICLE_BUTTON_CONFIGS}
          activeArticleId={activeArticleId}
          getArticleLabel={getArticleLabel}
          getArticleButtonTitle={(isEnabled) =>
            isEnabled ? t.articleButtonTitleEnabled : t.articleButtonTitleDisabled
          }
          getArticleStateLabel={(isEnabled) =>
            isEnabled ? t.articleReadyState : t.articleLockedState
          }
          onSelectArticle={handleArticleSelection}
        />
      </section>

      <ArticleImagePanel
        isVisible={hasActiveArticle}
        title={t.questionImageTitle}
        isImageUnavailable={isActiveArticleImageUnavailable}
        imageUnavailableText={t.questionImageUnavailable}
        imageUrl={activeArticleImageUrl}
        imageAlt={t.formatArticleImageAlt(activeArticleLabel)}
        onImageError={() => setIsActiveArticleImageUnavailable(true)}
      />

      <div className={`workspace-layout ${isReferenceCollapsed ? "reference-collapsed" : EMPTY_STRING}`}>
        {renderReferenceColumn()}
        {renderPracticeColumn()}
      </div>
    </main>
  );
}
