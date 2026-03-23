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
const SPACE_CHAR = " ";
const NON_BREAKING_SPACE = "\u00A0";
const LINE_TYPE_EXPECTED = "expected";
const LINE_TYPE_ACTUAL = "actual";
const DISPLAY_MISSING_MARK = "-";
const WORD_OR_NON_WORD_RE = /[A-Za-z]+|[^A-Za-z]/g;
const WORD_ONLY_RE = /^[A-Za-z]+$/;
const TOKEN_COST_SAME = 0;
const TOKEN_COST_EDIT = 1;
const TOKEN_COST_REPLACE_HIGH = 3;
const WORD_REPLACE_ALLOWED_DISTANCE = 1;
const SCROLL_BEHAVIOR_SMOOTH = "smooth";
const SCROLL_BEHAVIOR_AUTO = "auto";
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
const SAMPLE_ARTICLE = `The line graph illustrates energy consumption in the United States by six different fuel sources between 1980 and 2030, measured in quadrillion units.

Overall, petrol and oil remain by far the dominant source throughout the period, and their usage is expected to continue rising. Coal and natural gas form the second tier, with coal projected to overtake natural gas after 2015. By contrast, nuclear, solar/wind, and hydropower contribute relatively small proportions and show only modest changes.

In 1980, petrol and oil consumption stood at around 35 quadrillion units, significantly higher than other fuels. Although there was a slight decline in the mid-1980s, it then increased steadily, reaching approximately 40 units in 2005 and is forecast to climb to nearly 50 units by 2030.

Coal and natural gas displayed similar levels at the beginning, at about 16 and 20 units respectively. Natural gas fluctuated over time and is predicted to stabilize at around 25 units from 2015 onwards. Meanwhile, coal consumption rose gradually and is expected to surpass natural gas, reaching roughly 30 units by 2030.

The remaining energy sources were used far less. Nuclear energy increased slightly from about 4 to around 7 units, while solar and wind are projected to grow steadily to approximately 6 units. In contrast, hydropower remains relatively stable at just above 3 units throughout the period.`;
const DYNAMIC_DIFFERENT_TREND_ARTICLE = `The line graph compares the proportion of people aged 65 and over in Japan, Sweden and the USA between 1940 and 2040.

Overall, all three countries show an upward trend in the percentage of elderly people. However, Japan is expected to experience the most dramatic growth and will overtake both Sweden and the USA by 2040, despite having the lowest figures for much of the period.

In 1940, the USA had the highest proportion of older people at around 9%, followed by Sweden at approximately 7%, while Japan had the lowest figure at about 5%. Over the next five decades, the percentages in the USA and Sweden increased steadily, reaching roughly 15% and 14% respectively by 1990. In contrast, Japan saw a decline to around 3% and remained at a relatively low level until the late 20th century.

After 2000, Sweden’s elderly population rose significantly, peaking at about 20% around 2010 before experiencing a slight dip. Meanwhile, the USA showed a more gradual increase. Japan, however, is projected to rise sharply after 2020, climbing from around 10% to approximately 27% by 2040, making it the country with the highest proportion of elderly people.`;
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

function toDisplayChar(charValue) {
  if (charValue === SPACE_CHAR) return NON_BREAKING_SPACE;
  return charValue;
}

function toLineToken(token, lineType) {
  if (token.status === COMPARE_BREAK) {
    return { text: "\n", className: "token-line-break" };
  }

  if (lineType === LINE_TYPE_EXPECTED) {
    if (token.status === COMPARE_EXTRA) return null;
    if (token.status === COMPARE_OK) {
      return { text: toDisplayChar(token.expectedChar), className: "token-expected-ok" };
    }
    if (token.status === COMPARE_WRONG) {
      return { text: toDisplayChar(token.expectedChar), className: "token-expected-wrong" };
    }
    return { text: toDisplayChar(token.expectedChar), className: "token-expected-missing" };
  }

  if (token.status === COMPARE_MISSING) {
    return { text: DISPLAY_MISSING_MARK, className: "token-actual-missing" };
  }
  if (token.status === COMPARE_OK) {
    return { text: toDisplayChar(token.actualChar), className: "token-actual-ok" };
  }
  if (token.status === COMPARE_WRONG) {
    return { text: toDisplayChar(token.actualChar), className: "token-actual-wrong" };
  }
  return { text: toDisplayChar(token.actualChar), className: "token-actual-extra" };
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
  const isSinglePracticeTab = activePracticeTab === PRACTICE_TAB_SINGLE;
  const isMultiPracticeTab = activePracticeTab === PRACTICE_TAB_MULTI;

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

      // 輸入欄位聚焦時不要攔截快捷鍵，避免影響正常打字
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
  }, [activeArticleId]);

  useEffect(() => {
    if (isMultiPracticeStarted) {
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
    isMultiPracticeStarted,
    sourceSentenceList,
    selectedSentenceMap,
    multiTargetText,
    sentences,
    currentIndex,
    t,
  ]);

  const expectedLineTokens = useMemo(
    () =>
      comparisonTokens
        .map((token) => toLineToken(token, LINE_TYPE_EXPECTED))
        .filter((token) => token !== null),
    [comparisonTokens]
  );
  const actualLineTokens = useMemo(
    () => comparisonTokens.map((token) => toLineToken(token, LINE_TYPE_ACTUAL)),
    [comparisonTokens]
  );
  const legendItems = useMemo(
    () => [
      { id: COMPARE_OK, dotClassName: "legend-dot--ok", label: t.legendCorrect },
      { id: COMPARE_WRONG, dotClassName: "legend-dot--wrong", label: t.legendWrong },
      { id: COMPARE_MISSING, dotClassName: "legend-dot--missing", label: t.legendMissing },
      { id: COMPARE_EXTRA, dotClassName: "legend-dot--extra", label: t.legendExtra },
    ],
    [t]
  );
  const activeArticleLabel = hasActiveArticle ? getArticleLabel(activeArticleId) : EMPTY_STRING;

  function renderComparisonResult() {
    return (
      <>
        <ComparisonPanel
          panelRef={comparisonPanelRef}
          title={t.yourInputTitle}
          actualLineTokens={actualLineTokens}
          expectedLineTokens={expectedLineTokens}
        />
        <ComparisonLegend legendItems={legendItems} />
      </>
    );
  }

  return (
    <div className="container">
      <AppHeader
        title={t.appTitle}
        introHint={t.introHint}
        language={language}
        onLanguageChange={setLanguage}
        languageSwitchAria={t.languageSwitchAria}
      />
      <div className="card">
        <ArticleLibrary
          title={t.articleLibraryTitle}
          subtitle={t.articleLibrarySubtitle}
          articleConfigs={PRACTICE_ARTICLE_BUTTON_CONFIGS}
          activeArticleId={activeArticleId}
          getArticleLabel={getArticleLabel}
          getArticleButtonTitle={(isEnabled) =>
            isEnabled ? t.articleButtonTitleEnabled : t.articleButtonTitleDisabled
          }
          onSelectArticle={handleArticleSelection}
        />
      </div>

      <div className="card">
        <h2 className="section-title">{t.practiceAreaTitle}</h2>
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
        <ArticleImagePanel
          isVisible={hasActiveArticle}
          title={t.questionImageTitle}
          isImageUnavailable={isActiveArticleImageUnavailable}
          imageUnavailableText={t.questionImageUnavailable}
          imageUrl={activeArticleImageUrl}
          imageAlt={t.formatArticleImageAlt(activeArticleLabel)}
          onImageError={() => setIsActiveArticleImageUnavailable(true)}
        />
        {hasActiveArticle && (
          <section className="article-text-panel" aria-label={t.articleTextTitle}>
            <div className="article-text-title">{t.articleTextTitle}</div>
            <pre className="article-text-content">{activeArticleText}</pre>
          </section>
        )}

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
                  className="secondary compact"
                  onClick={toggleSingleSelectorPanel}
                >
                  {isSingleSelectorExpanded ? t.singleSelectorOpen : t.singleSelectorClosed}
                </button>
                <button className="secondary compact" onClick={goToPreviousSentence} disabled={!hasSentence}>
                  {t.previousSentence}
                </button>
                <button className="secondary compact" onClick={goToNextSentence} disabled={!hasSentence}>
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
                <div className="single-sentence-grid">
                  {sentences.map((sentence, index) => {
                    const isActiveSentence = index === currentIndex;
                    const displayIndex = index + 1;
                    return (
                      <button
                        key={`single-sentence-${index}`}
                        className={`single-sentence-button ${isActiveSentence ? "active" : EMPTY_STRING}`}
                        onClick={() => goToSentenceByIndex(index)}
                        aria-pressed={isActiveSentence}
                      >
                        <span className="single-sentence-index">
                          {t.formatSingleSentenceLabel(displayIndex)}
                        </span>
                        <span className="single-sentence-preview">{sentence}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {showHintMask && <div className="masked">{maskedSentence}</div>}
            <div className="row">
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
            <div className="row">
              <button onClick={checkCurrentAnswer} disabled={!hasSentence}>
                {t.checkAnswer}
              </button>
              <button className="secondary" onClick={retryCurrentSentence} disabled={!hasSentence}>
                {t.retryCurrentSentence}
              </button>
              <button className="secondary" onClick={goToNextSentence} disabled={!hasSentence}>
                {t.nextSentence}
              </button>
            </div>
            <div className="status">{resultStatus}</div>
            <div className="status">{t.singleShortcutHint}</div>
            {renderComparisonResult()}
            </>
          ) : isMultiPracticeStarted ? (
            <>
            <div className="sentence-header">
              <div className="sentence-nav">
                <div className="status sentence-status">{sentenceStatus}</div>
                <button
                  ref={multiSelectorToggleButtonRef}
                  className="secondary compact"
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
                <MultiSentenceChecklist
                  sentences={sourceSentenceList}
                  selectedSentenceMap={selectedSentenceMap}
                  onToggleSentence={toggleSentenceSelection}
                  itemKeyPrefix="multi-reselect"
                />
                <div className="row">
                  <button onClick={startMultiPracticeBySelection}>{t.confirmAndStart}</button>
                </div>
                <div className="status">{multiSelectionStatus}</div>
              </div>
            </div>
            {showHintMask && <div className="masked">{maskedSentence}</div>}
            <div className="row">
              <textarea
                ref={multiAnswerInputRef}
                value={multiAnswerInput}
                onChange={(event) => setMultiAnswerInput(event.target.value)}
                placeholder={t.inputPlaceholderMulti}
                className="multi-answer-input"
                spellCheck={false}
              />
            </div>
            <div className="row">
              <button onClick={checkMultiAnswer}>{t.checkAnswer}</button>
              <button className="secondary" onClick={retryMultiPractice}>
                {t.retryCurrentGroup}
              </button>
            </div>
            <div className="status">{resultStatus}</div>
            <div className="status">{t.multiShortcutHint}</div>
            {renderComparisonResult()}
            </>
          ) : (
            <div className="multi-practice-selector">
              <div className="status multi-practice-title">{t.multiNotStarted}</div>
              {sourceSentenceList.length === 0 ? (
                <div className="multi-practice-placeholder">{t.multiNotStartedPlaceholder}</div>
              ) : (
                <>
                  <MultiSentenceChecklist
                    sentences={sourceSentenceList}
                    selectedSentenceMap={selectedSentenceMap}
                    onToggleSentence={toggleSentenceSelection}
                    itemKeyPrefix="multi"
                  />
                  <div className="row">
                    <button onClick={startMultiPracticeBySelection}>{t.confirmAndStart}</button>
                  </div>
                  <div className="status">{multiSelectionStatus}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
