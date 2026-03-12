"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const KEY_ENTER = "Enter";
const KEY_TAB = "Tab";
const KEY_F2 = "F2";
const KEY_RETRY_SENTENCE = "1";
const EMPTY_STRING = "";
const SENTENCE_SEPARATOR = ".";
const MASK_CHAR = "_";
const WHITESPACE_RE = /\s+/g;
const LETTER_RE = /[A-Za-z]/;
const STATUS_IDLE = "idle";
const STATUS_READY_NEXT = "ready_next";
const TEXT_NO_SENTENCE = "沒有可練習的句子";
const TEXT_PASTE_FIRST = "請先貼上文章並開始練習";
const TEXT_NO_DOT = "沒有抓到句子，請確認有英文句號 .";
const TEXT_REPASTE = "請重新貼上內容";
const TEXT_LAST_SENTENCE = "已經是最後一句。";
const TEXT_FIRST_SENTENCE = "已經是第一句。";
const TEXT_CORRECT = "完全正確！";
const TEXT_SELECT_SENTENCE_FIRST = "請至少勾選一句再開始多句練習。";
const TEXT_MULTI_SHORTCUT_HINT = "快捷鍵：按 1 重練本組，F2 顯示提示";
const TEXT_MULTI_PASSED = "完全正確！多句已一次通過。";
const TEXT_MULTI_NOT_STARTED = "多句練習：尚未開始";
const TEXT_MULTI_SELECTOR_OPEN = "收合選句";
const TEXT_MULTI_SELECTOR_CLOSED = "重新選句";
const TEXT_SHORTCUT_HINT =
  "快捷鍵：Enter 檢查，檢查後按 Enter 下一句，按 1 重練本句，非輸入時 Tab 上一句";
const TEXT_IDLE_STATUS = "尚未開始練習";
const TEXT_IDLE_MASK = "_ _ _ _ _";
const DOT_COLOR_OK = "#15803d";
const DOT_COLOR_ERROR = "#b91c1c";
const DOT_COLOR_MISSING = "#fca5a5";
const TAG_INPUT = "INPUT";
const TAG_TEXTAREA = "TEXTAREA";
const COMPARE_OK = "ok";
const COMPARE_WRONG = "wrong";
const COMPARE_MISSING = "missing";
const COMPARE_EXTRA = "extra";
const SPACE_CHAR = " ";
const NON_BREAKING_SPACE = "\u00A0";
const LINE_TYPE_EXPECTED = "expected";
const LINE_TYPE_ACTUAL = "actual";
const DISPLAY_MISSING_MARK = "-";
const COST_SAME = 0;
const COST_EDIT = 1;
const MAX_ALIGNMENT_SHIFT = 24;
const SCROLL_BEHAVIOR_SMOOTH = "smooth";
const SCROLL_BLOCK_START = "start";
const IMAGE_MIME_PREFIX = "image/";
const SAMPLE_ARTICLE_IMAGE_PATH = "/sample-article-chart.png";
const PRACTICE_TAB_SINGLE = "single";
const PRACTICE_TAB_MULTI = "multi";
const SAMPLE_ARTICLE = `The graph shows energy consumption in the US from 1980 to 2012, and projected consumption to 2030.

Petrol and oil are the dominant fuel sources throughout this period, with 35 quadrillion (35q) units used in 1980, rising to 42q in 2012.

Despite some initial fluctuation, from 1995 there was a steady increase. This is expected to continue, reaching 47q in 2030.

In 1980, energy from nuclear, hydro and solar/wind power was equal at only 4q.

Nuclear has risen by 3q, and solar/wind by 2.

After slight increases, hydropower has fallen back to the 1980 figure.

It is expected to maintain this level until 2030, while the others should rise slightly after 2025.

Overall, the US will continue to rely on fossil fuels, with sustainable and nuclear energy sources remaining relatively insignificant.`;
const DOT_COLOR_EXTRA = "#8b5cf6";

function normalizeSpaces(text) {
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

function compareAnswer(target, input) {
  const targetChars = Array.from(target);
  const inputChars = Array.from(input);
  const targetLength = targetChars.length;
  const inputLength = inputChars.length;
  const distanceTable = Array.from({ length: targetLength + 1 }, () =>
    Array(inputLength + 1).fill(0)
  );
  const tokens = [];
  for (let row = 0; row <= targetLength; row += 1) {
    distanceTable[row][0] = row;
  }
  for (let column = 0; column <= inputLength; column += 1) {
    distanceTable[0][column] = column;
  }

  for (let row = 1; row <= targetLength; row += 1) {
    for (let column = 1; column <= inputLength; column += 1) {
      const isSameChar = targetChars[row - 1] === inputChars[column - 1];
      const alignmentShift = Math.abs(row - column);
      // 限制可對齊的位移量，避免把前段輸入錯配到句尾相同字母
      const canUseExactMatch = isSameChar && alignmentShift <= MAX_ALIGNMENT_SHIFT;
      const substitutionCost = canUseExactMatch ? COST_SAME : COST_EDIT;
      const substitution = distanceTable[row - 1][column - 1] + substitutionCost;
      const deletion = distanceTable[row - 1][column] + COST_EDIT;
      const insertion = distanceTable[row][column - 1] + COST_EDIT;
      distanceTable[row][column] = Math.min(substitution, deletion, insertion);
    }
  }

  let row = targetLength;
  let column = inputLength;
  while (row > 0 || column > 0) {
    const alignmentShift = Math.abs(row - column);
    if (
      row > 0 &&
      column > 0 &&
      targetChars[row - 1] === inputChars[column - 1] &&
      alignmentShift <= MAX_ALIGNMENT_SHIFT &&
      distanceTable[row][column] === distanceTable[row - 1][column - 1]
    ) {
      tokens.push({
        key: `ok-${row}-${column}`,
        status: COMPARE_OK,
        expectedChar: targetChars[row - 1],
        actualChar: inputChars[column - 1],
      });
      row -= 1;
      column -= 1;
      continue;
    }

    if (
      row > 0 &&
      column > 0 &&
      distanceTable[row][column] === distanceTable[row - 1][column - 1] + COST_EDIT
    ) {
      tokens.push({
        key: `wrong-${row}-${column}`,
        status: COMPARE_WRONG,
        expectedChar: targetChars[row - 1],
        actualChar: inputChars[column - 1],
      });
      row -= 1;
      column -= 1;
      continue;
    }

    if (row > 0 && distanceTable[row][column] === distanceTable[row - 1][column] + COST_EDIT) {
      tokens.push({
        key: `missing-${row}-${column}`,
        status: COMPARE_MISSING,
        expectedChar: targetChars[row - 1],
        actualChar: EMPTY_STRING,
      });
      row -= 1;
      continue;
    }

    tokens.push({
      key: `extra-${row}-${column}`,
      status: COMPARE_EXTRA,
      expectedChar: EMPTY_STRING,
      actualChar: inputChars[column - 1],
    });
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
  const [sourceText, setSourceText] = useState(EMPTY_STRING);
  const [sentences, setSentences] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState(EMPTY_STRING);
  const [resultStatus, setResultStatus] = useState(EMPTY_STRING);
  const [comparisonTokens, setComparisonTokens] = useState([]);
  const [practiceStatus, setPracticeStatus] = useState(STATUS_IDLE);
  const [sentenceStatus, setSentenceStatus] = useState(TEXT_IDLE_STATUS);
  const [maskedSentence, setMaskedSentence] = useState(TEXT_IDLE_MASK);
  const [showHintMask, setShowHintMask] = useState(true);
  const [uploadedImageSrc, setUploadedImageSrc] = useState(EMPTY_STRING);
  const [isDragOverUploadZone, setIsDragOverUploadZone] = useState(false);
  const [activePracticeTab, setActivePracticeTab] = useState(PRACTICE_TAB_SINGLE);
  const [isMultiPracticeStarted, setIsMultiPracticeStarted] = useState(false);
  const [isMultiSelectorExpanded, setIsMultiSelectorExpanded] = useState(true);
  const [selectedSentenceMap, setSelectedSentenceMap] = useState({});
  const [multiTargetText, setMultiTargetText] = useState(EMPTY_STRING);
  const [multiAnswerInput, setMultiAnswerInput] = useState(EMPTY_STRING);
  const [multiSelectionStatus, setMultiSelectionStatus] = useState(EMPTY_STRING);

  const answerInputRef = useRef(null);
  const multiAnswerInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const comparisonPanelRef = useRef(null);

  const hasSentence = useMemo(
    () => (sentences[currentIndex] ?? EMPTY_STRING).length > 0,
    [currentIndex, sentences]
  );
  const sourceSentenceList = useMemo(() => splitSentences(sourceText), [sourceText]);
  const isSinglePracticeTab = activePracticeTab === PRACTICE_TAB_SINGLE;
  const isMultiPracticeTab = activePracticeTab === PRACTICE_TAB_MULTI;

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
    answerInputRef.current?.focus();
  }

  function blurAnswerInput() {
    answerInputRef.current?.blur();
  }

  function renderCurrentSentence(nextSentences, nextIndex) {
    const sentence = nextSentences[nextIndex] ?? EMPTY_STRING;
    const sentenceCount = nextSentences.length;

    if (!sentence) {
      setSentenceStatus(TEXT_NO_SENTENCE);
      setMaskedSentence(TEXT_PASTE_FIRST);
      return;
    }

    const displayIndex = nextIndex + 1;
    setSentenceStatus(`第 ${displayIndex} / ${sentenceCount} 句`);
    setMaskedSentence(maskSentence(sentence));
  }

  function startPractice(textOverride = sourceText) {
    const nextSentences = splitSentences(textOverride);
    if (nextSentences.length === 0) {
      setSentenceStatus(TEXT_NO_DOT);
      setMaskedSentence(TEXT_REPASTE);
      return;
    }

    const FIRST_INDEX = 0;
    setSentences(nextSentences);
    setCurrentIndex(FIRST_INDEX);
    clearAnswerArea();
    renderCurrentSentence(nextSentences, FIRST_INDEX);
    focusAnswerInput();
  }

  function loadSampleAndStartPractice() {
    setSourceText(SAMPLE_ARTICLE);
    setUploadedImageSrc(SAMPLE_ARTICLE_IMAGE_PATH);
    startPractice(SAMPLE_ARTICLE);
  }

  function clearAllData() {
    const FIRST_INDEX = 0;
    setSourceText(EMPTY_STRING);
    setUploadedImageSrc(EMPTY_STRING);
    setSentences([]);
    setCurrentIndex(FIRST_INDEX);
    setSentenceStatus(TEXT_IDLE_STATUS);
    setMaskedSentence(TEXT_IDLE_MASK);
    setShowHintMask(true);
    setIsMultiPracticeStarted(false);
    setIsMultiSelectorExpanded(true);
    setSelectedSentenceMap({});
    setMultiTargetText(EMPTY_STRING);
    setMultiAnswerInput(EMPTY_STRING);
    setMultiSelectionStatus(EMPTY_STRING);
    clearAnswerArea();
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
      setMultiSelectionStatus(TEXT_SELECT_SENTENCE_FIRST);
      return;
    }

    const combinedSentenceText = normalizeSpaces(selectedSentences.join(" "));
    setMultiTargetText(combinedSentenceText);
    setMultiAnswerInput(EMPTY_STRING);
    setSentenceStatus(`多句練習：共 ${selectedSentences.length} 句`);
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
    setIsMultiSelectorExpanded((previousValue) => !previousValue);
  }

  function isImageFile(file) {
    return Boolean(file?.type?.startsWith(IMAGE_MIME_PREFIX));
  }

  function setImageFromFile(file) {
    if (!isImageFile(file)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setUploadedImageSrc(result);
      }
    };
    reader.readAsDataURL(file);
  }

  function openImagePicker() {
    imageInputRef.current?.click();
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
      setResultStatus(`${TEXT_CORRECT}（再按 Enter 可下一句）`);
    } else {
      const targetLength = Array.from(target).length;
      const accuracyPercent = Math.round(
        ((targetLength - result.wrongCount) / targetLength) * 100
      );
      setResultStatus(
        `有 ${result.wrongCount} 個字元錯誤，正確率 ${accuracyPercent}%（再按 Enter 可下一句，按 1 可重練）`
      );
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
      setResultStatus(TEXT_MULTI_PASSED);
    } else {
      const targetLength = Array.from(multiTargetText).length;
      const accuracyPercent = Math.round(
        ((targetLength - result.wrongCount) / targetLength) * 100
      );
      setResultStatus(`尚未全對：有 ${result.wrongCount} 個字元錯誤，正確率 ${accuracyPercent}%`);
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
      setResultStatus(TEXT_LAST_SENTENCE);
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
      setResultStatus(TEXT_FIRST_SENTENCE);
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

        if (event.key === KEY_TAB) {
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

    function onGlobalPaste(event) {
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) return;

      for (let index = 0; index < clipboardItems.length; index += 1) {
        const item = clipboardItems[index];
        if (!item.type.startsWith(IMAGE_MIME_PREFIX)) continue;
        const imageFile = item.getAsFile();
        if (!imageFile) continue;
        event.preventDefault();
        setImageFromFile(imageFile);
        return;
      }
    }

    window.addEventListener("keydown", onGlobalKeyDown);
    window.addEventListener("paste", onGlobalPaste);
    return () => {
      window.removeEventListener("keydown", onGlobalKeyDown);
      window.removeEventListener("paste", onGlobalPaste);
    };
  }, [practiceStatus, currentIndex, sentences, hasSentence, isSinglePracticeTab, isMultiPracticeTab, isMultiPracticeStarted]);

  useEffect(() => {
    setSelectedSentenceMap({});
    setIsMultiPracticeStarted(false);
    setIsMultiSelectorExpanded(true);
    setMultiTargetText(EMPTY_STRING);
    setMultiAnswerInput(EMPTY_STRING);
    setMultiSelectionStatus(EMPTY_STRING);
  }, [sourceText]);

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

  return (
    <div className="container">
      <div className="card">
        <h1>英文句子背誦練習</h1>
        <p className="hint">
          1) 先貼上文章。2) 按「開始練習」。3) 每次輸入一個句子，按 Enter 進行比對。
        </p>
        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder="請貼上英文文章（以英文句號 . 分句）"
          spellCheck={false}
        />
        {!uploadedImageSrc && (
          <div
            className={`upload-zone ${isDragOverUploadZone ? "is-drag-over" : EMPTY_STRING}`}
            onClick={openImagePicker}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOverUploadZone(true);
            }}
            onDragLeave={() => setIsDragOverUploadZone(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragOverUploadZone(false);
              const droppedFile = event.dataTransfer.files?.[0];
              if (!droppedFile) return;
              setImageFromFile(droppedFile);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === KEY_ENTER) {
                openImagePicker();
              }
            }}
          >
            <div className="upload-title">圖片上傳區</div>
            <div className="upload-description">點擊選檔、拖曳圖片到此處，或直接 Ctrl+V 貼上圖片</div>
          </div>
        )}
        <input
          ref={imageInputRef}
          className="upload-input-hidden"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            if (!selectedFile) return;
            setImageFromFile(selectedFile);
            event.target.value = EMPTY_STRING;
          }}
        />
        {uploadedImageSrc && (
          <div className="uploaded-image-card">
            <img src={uploadedImageSrc} alt="上傳圖片預覽" className="uploaded-image-preview" />
          </div>
        )}
        <div className="row">
          <button onClick={startPractice}>開始練習</button>
          <button className="secondary" onClick={loadSampleAndStartPractice}>
            範例文章
          </button>
          <button className="danger" onClick={clearAllData}>
            清空
          </button>
        </div>
      </div>

      <div className="card">
        <div className="practice-tab-bar">
          <button
            className={`practice-tab-button ${
              activePracticeTab === PRACTICE_TAB_SINGLE ? "active" : EMPTY_STRING
            }`}
            onClick={() => setActivePracticeTab(PRACTICE_TAB_SINGLE)}
          >
            單句練習
          </button>
          <button
            className={`practice-tab-button ${
              activePracticeTab === PRACTICE_TAB_MULTI ? "active" : EMPTY_STRING
            }`}
            onClick={() => setActivePracticeTab(PRACTICE_TAB_MULTI)}
          >
            多句練習
          </button>
        </div>

        {isSinglePracticeTab ? (
          <>
            <div className="sentence-header">
              <div className="sentence-nav">
                <div className="status sentence-status">{sentenceStatus}</div>
                <button className="secondary compact" onClick={goToPreviousSentence} disabled={!hasSentence}>
                  上一句
                </button>
                <button className="secondary compact" onClick={goToNextSentence} disabled={!hasSentence}>
                  下一句
                </button>
              </div>
              <label className="hint-toggle">
                <input
                  type="checkbox"
                  checked={showHintMask}
                  onChange={(event) => setShowHintMask(event.target.checked)}
                />
                顯示提示 (F2)
              </label>
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
                placeholder="在這裡輸入完整句子，按 Enter 比對"
                disabled={!hasSentence}
                spellCheck={false}
              />
            </div>
            <div className="row">
              <button onClick={checkCurrentAnswer} disabled={!hasSentence}>
                檢查答案
              </button>
              <button className="secondary" onClick={retryCurrentSentence} disabled={!hasSentence}>
                重練這一句
              </button>
              <button className="secondary" onClick={goToNextSentence} disabled={!hasSentence}>
                下一句
              </button>
            </div>
            <div className="status">{resultStatus}</div>
            <div className="status">{TEXT_SHORTCUT_HINT}</div>
            <div ref={comparisonPanelRef} className="comparison-panel" aria-live="polite">
              <div className="comparison-title">你的輸入</div>
              <div className="comparison-line">
                <div className="comparison-content anki-line">
                  {actualLineTokens.map((token, index) => (
                    <span key={`actual-${index}`} className={token.className}>
                      {token.text}
                    </span>
                  ))}
                </div>
              </div>
              <div className="comparison-separator">↓</div>
              <div className="comparison-line">
                <div className="comparison-content anki-line">
                  {expectedLineTokens.map((token, index) => (
                    <span key={`expected-${index}`} className={token.className}>
                      {token.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="legend">
              <span>
                <i className="dot" style={{ background: DOT_COLOR_OK }} />
                正確字元
              </span>
              <span>
                <i className="dot" style={{ background: DOT_COLOR_ERROR }} />
                錯誤字元
              </span>
              <span>
                <i className="dot" style={{ background: DOT_COLOR_MISSING }} />
                少打字元
              </span>
              <span>
                <i className="dot" style={{ background: DOT_COLOR_EXTRA }} />
                多打字元
              </span>
            </div>
          </>
        ) : isMultiPracticeStarted ? (
          <>
            <div className="sentence-header">
              <div className="sentence-nav">
                <div className="status sentence-status">{sentenceStatus}</div>
                <button className="secondary compact" onClick={toggleMultiSelectorPanel}>
                  {isMultiSelectorExpanded ? TEXT_MULTI_SELECTOR_OPEN : TEXT_MULTI_SELECTOR_CLOSED}
                </button>
              </div>
              <label className="hint-toggle">
                <input
                  type="checkbox"
                  checked={showHintMask}
                  onChange={(event) => setShowHintMask(event.target.checked)}
                />
                顯示提示 (F2)
              </label>
            </div>
            <div
              className={`multi-selector-collapse ${
                isMultiSelectorExpanded ? "expanded" : EMPTY_STRING
              }`}
            >
              <div className="multi-practice-selector">
                <div className="status multi-practice-title">請勾選要背誦的句子</div>
                <div className="multi-sentence-list">
                  {sourceSentenceList.map((sentence, index) => {
                    const isChecked = Boolean(selectedSentenceMap[index]);
                    const displayIndex = index + 1;
                    return (
                      <label key={`multi-reselect-${index}`} className="multi-sentence-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSentenceSelection(index)}
                        />
                        <span className="multi-sentence-index">{displayIndex}.</span>
                        <span className="multi-sentence-text">{sentence}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="row">
                  <button onClick={startMultiPracticeBySelection}>確認並開始背誦</button>
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
                placeholder="一次輸入勾選的所有句子（可換行）"
                className="multi-answer-input"
                spellCheck={false}
              />
            </div>
            <div className="row">
              <button onClick={checkMultiAnswer}>檢查答案</button>
              <button className="secondary" onClick={retryMultiPractice}>
                重練這組
              </button>
            </div>
            <div className="status">{resultStatus}</div>
            <div className="status">{TEXT_MULTI_SHORTCUT_HINT}</div>
            <div ref={comparisonPanelRef} className="comparison-panel" aria-live="polite">
              <div className="comparison-title">你的輸入</div>
              <div className="comparison-line">
                <div className="comparison-content anki-line">
                  {actualLineTokens.map((token, index) => (
                    <span key={`actual-${index}`} className={token.className}>
                      {token.text}
                    </span>
                  ))}
                </div>
              </div>
              <div className="comparison-separator">↓</div>
              <div className="comparison-line">
                <div className="comparison-content anki-line">
                  {expectedLineTokens.map((token, index) => (
                    <span key={`expected-${index}`} className={token.className}>
                      {token.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="legend">
              <span>
                <i className="dot" style={{ background: DOT_COLOR_OK }} />
                正確字元
              </span>
              <span>
                <i className="dot" style={{ background: DOT_COLOR_ERROR }} />
                錯誤字元
              </span>
              <span>
                <i className="dot" style={{ background: DOT_COLOR_MISSING }} />
                少打字元
              </span>
              <span>
                <i className="dot" style={{ background: DOT_COLOR_EXTRA }} />
                多打字元
              </span>
            </div>
          </>
        ) : (
          <div className="multi-practice-selector">
            <div className="status multi-practice-title">{TEXT_MULTI_NOT_STARTED}</div>
            {sourceSentenceList.length === 0 ? (
              <div className="multi-practice-placeholder">請先在上方貼入文章，再到這裡勾選句子。</div>
            ) : (
              <>
                <div className="multi-sentence-list">
                  {sourceSentenceList.map((sentence, index) => {
                    const isChecked = Boolean(selectedSentenceMap[index]);
                    const displayIndex = index + 1;
                    return (
                      <label key={`multi-${index}`} className="multi-sentence-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSentenceSelection(index)}
                        />
                        <span className="multi-sentence-index">{displayIndex}.</span>
                        <span className="multi-sentence-text">{sentence}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="row">
                  <button onClick={startMultiPracticeBySelection}>確認並開始背誦</button>
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
