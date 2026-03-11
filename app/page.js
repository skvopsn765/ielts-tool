"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const KEY_ENTER = "Enter";
const KEY_R_LOWER = "r";
const KEY_R_UPPER = "R";
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
const TEXT_CORRECT = "完全正確！";
const TEXT_SHORTCUT_HINT = "快捷鍵：Enter 檢查，檢查後 Enter 下一句，R 重練本句";
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
const DISPLAY_MISSING_CHAR = "_";
const LINE_EXPECTED = "expected";
const LINE_ACTUAL = "actual";
const WHITESPACE_CHAR_RE = /\s/;

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
  const maxLength = Math.max(targetChars.length, inputChars.length);
  const tokens = [];
  let wrongCount = 0;

  for (let index = 0; index < maxLength; index += 1) {
    const targetChar = targetChars[index];
    const inputChar = inputChars[index];

    if (targetChar === undefined) {
      wrongCount += 1;
      tokens.push({
        key: `extra-${index}`,
        status: COMPARE_EXTRA,
        expectedChar: EMPTY_STRING,
        actualChar: inputChar ?? EMPTY_STRING,
      });
      continue;
    }

    if (inputChar === undefined) {
      wrongCount += 1;
      tokens.push({
        key: `missing-${index}`,
        status: COMPARE_MISSING,
        expectedChar: targetChar,
        actualChar: EMPTY_STRING,
      });
      continue;
    }

    if (inputChar === targetChar) {
      tokens.push({
        key: `ok-${index}`,
        status: COMPARE_OK,
        expectedChar: targetChar,
        actualChar: inputChar,
      });
    } else {
      wrongCount += 1;
      tokens.push({
        key: `wrong-${index}`,
        status: COMPARE_WRONG,
        expectedChar: targetChar,
        actualChar: inputChar,
      });
    }
  }

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

  if (token.status === COMPARE_MISSING) {
    return { value: DISPLAY_MISSING_CHAR, className: "char-missing" };
  }
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
  const [sentenceStatus, setSentenceStatus] = useState("尚未開始練習");
  const [maskedSentence, setMaskedSentence] = useState("_ _ _ _ _");

  const answerInputRef = useRef(null);
  const ignoreNextGlobalEnterRef = useRef(false);

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

  function startPractice() {
    const nextSentences = splitSentences(sourceText);
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
        `有 ${result.wrongCount} 個字元錯誤，正確率 ${accuracyPercent}%（再按 Enter 可下一句，按 R 可重練）`
      );
    }

    setComparisonTokens(result.tokens);
    setPracticeStatus(STATUS_READY_NEXT);
    blurAnswerInput();
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

  useEffect(() => {
    function onGlobalKeyDown(event) {
      // 避免同一次 Enter 事件同時觸發「檢查」與「下一句」
      if (event.key === KEY_ENTER && ignoreNextGlobalEnterRef.current) {
        ignoreNextGlobalEnterRef.current = false;
        return;
      }

      // 輸入欄位聚焦時不要攔截快捷鍵，避免影響正常打字
      if (isTypingElement(document.activeElement)) {
        return;
      }

      if (practiceStatus === STATUS_READY_NEXT && event.key === KEY_ENTER) {
        event.preventDefault();
        goToNextSentence();
        return;
      }

      if (event.key === KEY_R_LOWER || event.key === KEY_R_UPPER) {
        event.preventDefault();
        retryCurrentSentence();
      }
    }

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", onGlobalKeyDown);
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
        <div className="row">
          <button onClick={startPractice}>開始練習</button>
        </div>
      </div>

      <div className="card">
        <div className="status">{sentenceStatus}</div>
        <div className="masked">{maskedSentence}</div>
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
                ignoreNextGlobalEnterRef.current = true;
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
        <div className="comparison-panel" aria-live="polite">
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
