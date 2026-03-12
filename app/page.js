"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const KEY_ENTER = "Enter";
const KEY_TAB = "Tab";
const KEY_NEXT_SENTENCE = "1";
const KEY_RETRY_SENTENCE = "2";
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
const TEXT_SHORTCUT_HINT =
  "快捷鍵：Enter 檢查，檢查後按 1 或 Enter 下一句，按 2 重練本句，非輸入時 Tab 上一句";
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
const LINE_EXPECTED = "expected";
const LINE_ACTUAL = "actual";
const WHITESPACE_CHAR_RE = /\s/;
const COST_SAME = 0;
const COST_EDIT = 1;
const SCROLL_BEHAVIOR_SMOOTH = "smooth";
const SCROLL_BLOCK_START = "start";
const IMAGE_MIME_PREFIX = "image/";
const SAMPLE_ARTICLE_IMAGE_PATH = "/sample-article-chart.png";
const SAMPLE_ARTICLE = `The graph shows energy consumption in the US from 1980 to 2012, and projected consumption to 2030.

Petrol and oil are the dominant fuel sources throughout this period, with 35 quadrillion (35q) units used in 1980, rising to 42q in 2012.

Despite some initial fluctuation, from 1995 there was a steady increase. This is expected to continue, reaching 47q in 2030.

In 1980, energy from nuclear, hydro and solar/wind power was equal at only 4q.

Nuclear has risen by 3q, and solar/wind by 2.

After slight increases, hydropower has fallen back to the 1980 figure.

It is expected to maintain this level until 2030, while the others should rise slightly after 2025.

Overall, the US will continue to rely on fossil fuels, with sustainable and nuclear energy sources remaining relatively insignificant.`;

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
      const substitutionCost = isSameChar ? COST_SAME : COST_EDIT;
      const substitution = distanceTable[row - 1][column - 1] + substitutionCost;
      const deletion = distanceTable[row - 1][column] + COST_EDIT;
      const insertion = distanceTable[row][column - 1] + COST_EDIT;
      distanceTable[row][column] = Math.min(substitution, deletion, insertion);
    }
  }

  let row = targetLength;
  let column = inputLength;
  while (row > 0 || column > 0) {
    if (
      row > 0 &&
      column > 0 &&
      targetChars[row - 1] === inputChars[column - 1] &&
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

function isWhitespaceChar(charValue) {
  return WHITESPACE_CHAR_RE.test(charValue);
}

function getLineCharMeta(token, lineType) {
  if (lineType === LINE_EXPECTED) {
    if (token.status === COMPARE_EXTRA) return null;
    if (token.status === COMPARE_OK) {
      return { value: token.expectedChar, className: "char-correct" };
    }
    if (token.status === COMPARE_WRONG) {
      return { value: token.expectedChar, className: "char-wrong" };
    }
    return { value: token.expectedChar, className: "char-missing" };
  }

  if (token.status === COMPARE_MISSING) return null;
  if (token.status === COMPARE_OK) {
    return { value: token.actualChar, className: "char-correct" };
  }
  if (token.status === COMPARE_WRONG) {
    return { value: token.actualChar, className: "char-wrong" };
  }
  return { value: token.actualChar, className: "char-extra" };
}

function buildLineGroups(tokens, lineType) {
  const groups = [];
  let currentWordChars = [];

  function flushWordGroup() {
    if (currentWordChars.length === 0) return;
    groups.push({
      key: `${lineType}-word-${groups.length}`,
      type: "word",
      chars: currentWordChars,
    });
    currentWordChars = [];
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const charMeta = getLineCharMeta(token, lineType);
    if (!charMeta || charMeta.value === EMPTY_STRING) continue;

    if (isWhitespaceChar(charMeta.value)) {
      flushWordGroup();
      groups.push({
        key: `${lineType}-space-${groups.length}`,
        type: "space",
        value: charMeta.value === SPACE_CHAR ? NON_BREAKING_SPACE : charMeta.value,
      });
      continue;
    }

    currentWordChars.push({
      key: `${lineType}-char-${index}`,
      className: charMeta.className,
      value: charMeta.value,
    });
  }

  flushWordGroup();
  return groups;
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

  const answerInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const comparisonPanelRef = useRef(null);

  const hasSentence = useMemo(
    () => (sentences[currentIndex] ?? EMPTY_STRING).length > 0,
    [currentIndex, sentences]
  );

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
    clearAnswerArea();
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
      setResultStatus(`${TEXT_CORRECT}（再按 1 或 Enter 可下一句）`);
    } else {
      const targetLength = Array.from(target).length;
      const accuracyPercent = Math.round(
        ((targetLength - result.wrongCount) / targetLength) * 100
      );
      setResultStatus(
        `有 ${result.wrongCount} 個字元錯誤，正確率 ${accuracyPercent}%（再按 1 或 Enter 可下一句，按 2 可重練）`
      );
    }

    setComparisonTokens(result.tokens);
    setPracticeStatus(STATUS_READY_NEXT);
    blurAnswerInput();
    scrollToPracticeResultArea();
  }

  function retryCurrentSentence() {
    clearAnswerArea();
    focusAnswerInput();
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
      // 輸入欄位聚焦時不要攔截快捷鍵，避免影響正常打字
      if (isTypingElement(document.activeElement)) {
        return;
      }

      if (event.key === KEY_TAB) {
        event.preventDefault();
        goToPreviousSentence();
        return;
      }

      const isNextSentenceKey = event.key === KEY_NEXT_SENTENCE || event.key === KEY_ENTER;
      if (practiceStatus === STATUS_READY_NEXT && isNextSentenceKey) {
        event.preventDefault();
        goToNextSentence();
        return;
      }

      if (event.key === KEY_RETRY_SENTENCE) {
        event.preventDefault();
        retryCurrentSentence();
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
  }, [practiceStatus, currentIndex, sentences]);

  const expectedLineGroups = useMemo(
    () => buildLineGroups(comparisonTokens, LINE_EXPECTED),
    [comparisonTokens]
  );
  const actualLineGroups = useMemo(
    () => buildLineGroups(comparisonTokens, LINE_ACTUAL),
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
            顯示提示
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
          <div className="comparison-line">
            <div className="comparison-label">原句</div>
            <div className="comparison-content">
              {expectedLineGroups.map((group) => (
                group.type === "space" ? (
                  <span key={group.key} className="word-gap">
                    {group.value}
                  </span>
                ) : (
                  <span key={group.key} className="word-chip">
                    {group.chars.map((charItem) => (
                      <span key={charItem.key} className={charItem.className}>
                        {charItem.value}
                      </span>
                    ))}
                  </span>
                )
              ))}
            </div>
          </div>
          <div className="comparison-line">
            <div className="comparison-label">你的輸入</div>
            <div className="comparison-content">
              {actualLineGroups.map((group) => (
                group.type === "space" ? (
                  <span key={group.key} className="word-gap">
                    {group.value}
                  </span>
                ) : (
                  <span key={group.key} className="word-chip">
                    {group.chars.map((charItem) => (
                      <span key={charItem.key} className={charItem.className}>
                        {charItem.value}
                      </span>
                    ))}
                  </span>
                )
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
            遺漏字元
          </span>
        </div>
      </div>
    </div>
  );
}
