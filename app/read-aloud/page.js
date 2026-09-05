"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LANG_EN, LANG_TW, UI_TEXTS } from "../i18n";
import AppHeader from "../components/AppHeader";
import TtsPlayerBar from "../components/TtsPlayerBar";
import {
  EMPTY_STRING,
  PARAGRAPH_BREAK_SEPARATOR,
  TTS_LANG_PREFERRED,
  TTS_RATE_DEFAULT,
  TTS_RATE_DISPLAY_DECIMALS,
  TTS_RATE_MAX,
  TTS_RATE_MIN,
  TTS_RATE_STEP,
  TTS_SENTENCE_INDEX_START,
  TTS_STATE_IDLE,
  TTS_STATE_PAUSED,
  TTS_STATE_PLAYING,
  TTS_ERROR_CANCELED,
  TTS_ERROR_INTERRUPTED,
  VOICE_LOAD_RETRY_INTERVAL_MS,
  VOICE_LOAD_RETRY_MAX_ATTEMPTS,
  clampTtsRate,
  countWords,
  filterUkVoiceList,
  splitPastedArticleIntoSentences,
} from "../../lib/tts";

const PATH_PRACTICE = "/";
const PATH_READ_ALOUD = "/read-aloud";
const STORAGE_KEY_READ_ALOUD_TEXT = "ielts-tool.read-aloud.text";
const SCROLL_BEHAVIOR_SMOOTH = "smooth";
const SCROLL_BLOCK_CENTER = "center";
const KEY_ENTER = "Enter";
const KEY_SPACE = " ";

export default function ReadAloudPage() {
  const [language, setLanguage] = useState(LANG_TW);
  const [langInitialized, setLangInitialized] = useState(false);
  const [pastedText, setPastedText] = useState(EMPTY_STRING);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [ttsState, setTtsState] = useState(TTS_STATE_IDLE);
  const [ttsVoiceList, setTtsVoiceList] = useState([]);
  const [ttsSelectedVoiceURI, setTtsSelectedVoiceURI] = useState(EMPTY_STRING);
  const [currentTtsSentenceIndex, setCurrentTtsSentenceIndex] = useState(TTS_SENTENCE_INDEX_START);
  const [isTtsRepeat, setIsTtsRepeat] = useState(true);
  const [ttsRate, setTtsRate] = useState(TTS_RATE_DEFAULT);

  const t = UI_TEXTS[language];
  const ttsUtteranceRef = useRef(null);
  const isTtsRepeatRef = useRef(true);
  const ttsRateRef = useRef(TTS_RATE_DEFAULT);
  const ttsSentencesRef = useRef([]);
  const ttsHandlersRef = useRef({});
  const ttsVoiceListRef = useRef([]);
  const ttsSelectedVoiceURIRef = useRef(EMPTY_STRING);
  const currentTtsSentenceIndexRef = useRef(TTS_SENTENCE_INDEX_START);
  const ttsStateRef = useRef(TTS_STATE_IDLE);

  const ttsSentences = useMemo(() => splitPastedArticleIntoSentences(pastedText), [pastedText]);
  ttsSentencesRef.current = ttsSentences;
  ttsVoiceListRef.current = ttsVoiceList;
  ttsSelectedVoiceURIRef.current = ttsSelectedVoiceURI;
  currentTtsSentenceIndexRef.current = currentTtsSentenceIndex;
  ttsStateRef.current = ttsState;

  const isTtsPlaying = ttsState === TTS_STATE_PLAYING;
  const isTtsPaused = ttsState === TTS_STATE_PAUSED;
  const isTtsIdle = ttsState === TTS_STATE_IDLE;
  const hasSentences = ttsSentences.length > 0;
  const wordCount = useMemo(() => countWords(pastedText), [pastedText]);

  function clearUtteranceHandlers() {
    const previousUtterance = ttsUtteranceRef.current;
    if (previousUtterance) {
      previousUtterance.onend = null;
      previousUtterance.onerror = null;
    }
  }

  function resolveTtsVoicesFromSystem() {
    const allVoices = window.speechSynthesis.getVoices();
    if (allVoices.length === 0) return null;
    return filterUkVoiceList(allVoices);
  }

  function playSentence(index) {
    clearUtteranceHandlers();
    window.speechSynthesis.cancel();
    const currentSentences = ttsSentencesRef.current;
    if (index < 0 || index >= currentSentences.length) return;

    currentTtsSentenceIndexRef.current = index;
    setCurrentTtsSentenceIndex(index);
    const utterance = new SpeechSynthesisUtterance(currentSentences[index].text);
    const latestVoiceList = resolveTtsVoicesFromSystem();
    if (latestVoiceList) {
      setTtsVoiceList((previousList) => {
        const previousURIs = previousList.map((voice) => voice.voiceURI).join();
        const nextURIs = latestVoiceList.map((voice) => voice.voiceURI).join();
        return previousURIs === nextURIs ? previousList : latestVoiceList;
      });
    }

    const activeList = latestVoiceList ?? ttsVoiceListRef.current;
    const selectedVoiceURI = ttsSelectedVoiceURIRef.current;
    const voice =
      activeList.find((item) => item.voiceURI === selectedVoiceURI) ?? activeList[0] ?? null;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = TTS_LANG_PREFERRED;
    }
    utterance.rate = ttsRateRef.current;

    utterance.onend = () => {
      const nextIndex = index + 1;
      const sentencesSnapshot = ttsSentencesRef.current;
      if (nextIndex < sentencesSnapshot.length) {
        playSentence(nextIndex);
      } else if (isTtsRepeatRef.current && sentencesSnapshot.length > 0) {
        playSentence(TTS_SENTENCE_INDEX_START);
      } else {
        ttsStateRef.current = TTS_STATE_IDLE;
        currentTtsSentenceIndexRef.current = TTS_SENTENCE_INDEX_START;
        setTtsState(TTS_STATE_IDLE);
        setCurrentTtsSentenceIndex(TTS_SENTENCE_INDEX_START);
      }
    };
    utterance.onerror = (event) => {
      if (event.error === TTS_ERROR_INTERRUPTED || event.error === TTS_ERROR_CANCELED) return;
      ttsStateRef.current = TTS_STATE_IDLE;
      setTtsState(TTS_STATE_IDLE);
    };

    ttsUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    ttsStateRef.current = TTS_STATE_PLAYING;
    setTtsState(TTS_STATE_PLAYING);
  }

  function handleTtsPlay() {
    if (ttsSentencesRef.current.length === 0) return;
    playSentence(currentTtsSentenceIndexRef.current);
  }

  function handleTtsPause() {
    clearUtteranceHandlers();
    window.speechSynthesis.cancel();
    ttsStateRef.current = TTS_STATE_PAUSED;
    setTtsState(TTS_STATE_PAUSED);
  }

  function handleTtsStop() {
    clearUtteranceHandlers();
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    ttsUtteranceRef.current = null;
    ttsStateRef.current = TTS_STATE_IDLE;
    currentTtsSentenceIndexRef.current = TTS_SENTENCE_INDEX_START;
    setTtsState(TTS_STATE_IDLE);
    setCurrentTtsSentenceIndex(TTS_SENTENCE_INDEX_START);
  }

  function handleTtsPrev() {
    const previousIndex = Math.max(
      TTS_SENTENCE_INDEX_START,
      currentTtsSentenceIndexRef.current - 1
    );
    playSentence(previousIndex);
  }

  function handleTtsNext() {
    const lastIndex = ttsSentencesRef.current.length - 1;
    const nextIndex = Math.min(lastIndex, currentTtsSentenceIndexRef.current + 1);
    playSentence(nextIndex);
  }

  function toggleTtsRepeat() {
    setIsTtsRepeat((previousValue) => {
      const nextValue = !previousValue;
      isTtsRepeatRef.current = nextValue;
      return nextValue;
    });
  }

  function handleRateChange(nextRate) {
    const clampedRate = clampTtsRate(nextRate);
    ttsRateRef.current = clampedRate;
    setTtsRate(clampedRate);
    if (ttsStateRef.current === TTS_STATE_PLAYING) {
      playSentence(currentTtsSentenceIndexRef.current);
    }
  }

  function handleClearText() {
    handleTtsStop();
    setPastedText(EMPTY_STRING);
  }

  function handleSentenceActivate(sentenceIndex) {
    playSentence(sentenceIndex);
  }

  ttsHandlersRef.current = {
    handleTtsPlay,
    handleTtsPause,
    handleTtsStop,
    handleTtsPrev,
    handleTtsNext,
  };

  useLayoutEffect(() => {
    const detected = (navigator.language ?? EMPTY_STRING).toLowerCase().startsWith("zh")
      ? LANG_TW
      : LANG_EN;
    if (detected !== LANG_TW) {
      setLanguage(detected);
    }
    setLangInitialized(true);
  }, []);

  useLayoutEffect(() => {
    try {
      const savedText = sessionStorage.getItem(STORAGE_KEY_READ_ALOUD_TEXT);
      if (savedText) setPastedText(savedText);
    } catch {
      // Ignore storage access errors (private mode / blocked storage).
    }
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    try {
      sessionStorage.setItem(STORAGE_KEY_READ_ALOUD_TEXT, pastedText);
    } catch {
      // Ignore storage access errors (private mode / blocked storage).
    }
  }, [pastedText, isStorageReady]);

  useEffect(() => {
    function loadVoices() {
      const resolved = resolveTtsVoicesFromSystem();
      if (!resolved) return false;
      setTtsVoiceList(resolved);
      setTtsSelectedVoiceURI((previousURI) => previousURI || resolved[0]?.voiceURI || EMPTY_STRING);
      return true;
    }

    const loadedImmediately = loadVoices();
    let retryCount = 0;
    const retryTimerId = window.setInterval(() => {
      retryCount += 1;
      const loaded = loadVoices();
      if (loaded || retryCount >= VOICE_LOAD_RETRY_MAX_ATTEMPTS) {
        window.clearInterval(retryTimerId);
      }
    }, VOICE_LOAD_RETRY_INTERVAL_MS);
    if (loadedImmediately) {
      window.clearInterval(retryTimerId);
    }
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.clearInterval(retryTimerId);
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    clearUtteranceHandlers();
    window.speechSynthesis.cancel();
    ttsUtteranceRef.current = null;
    ttsStateRef.current = TTS_STATE_IDLE;
    currentTtsSentenceIndexRef.current = TTS_SENTENCE_INDEX_START;
    setTtsState(TTS_STATE_IDLE);
    setCurrentTtsSentenceIndex(TTS_SENTENCE_INDEX_START);
    return () => {
      clearUtteranceHandlers();
      window.speechSynthesis.cancel();
    };
  }, [pastedText]);

  useEffect(() => {
    if (!isTtsIdle) {
      clearUtteranceHandlers();
      window.speechSynthesis.cancel();
      ttsUtteranceRef.current = null;
      ttsStateRef.current = TTS_STATE_IDLE;
      currentTtsSentenceIndexRef.current = TTS_SENTENCE_INDEX_START;
      setTtsState(TTS_STATE_IDLE);
      setCurrentTtsSentenceIndex(TTS_SENTENCE_INDEX_START);
    }
  }, [ttsSelectedVoiceURI]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => ttsHandlersRef.current.handleTtsPlay());
    navigator.mediaSession.setActionHandler("pause", () => ttsHandlersRef.current.handleTtsPause());
    navigator.mediaSession.setActionHandler("stop", () => ttsHandlersRef.current.handleTtsStop());
    navigator.mediaSession.setActionHandler("previoustrack", () => ttsHandlersRef.current.handleTtsPrev());
    navigator.mediaSession.setActionHandler("nexttrack", () => ttsHandlersRef.current.handleTtsNext());
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (isTtsPlaying) {
      navigator.mediaSession.playbackState = "playing";
    } else if (isTtsPaused) {
      navigator.mediaSession.playbackState = "paused";
    } else {
      navigator.mediaSession.playbackState = "none";
    }
  }, [ttsState, isTtsPlaying, isTtsPaused]);

  useEffect(() => {
    if (!isTtsPlaying) return;
    const activeSentence = document.querySelector(
      `[data-read-aloud-sentence-index="${currentTtsSentenceIndex}"]`
    );
    activeSentence?.scrollIntoView({ behavior: SCROLL_BEHAVIOR_SMOOTH, block: SCROLL_BLOCK_CENTER });
  }, [currentTtsSentenceIndex, isTtsPlaying]);

  const navItems = [
    { href: PATH_PRACTICE, label: t.navPractice },
    { href: PATH_READ_ALOUD, label: t.navReadAloud },
  ];

  return (
    <main className="container app-shell">
      <AppHeader
        kicker={t.readAloudKicker}
        title={t.readAloudTitle}
        introHint={t.readAloudHint}
        language={language}
        onLanguageChange={setLanguage}
        languageSwitchAria={t.languageSwitchAria}
        langReady={langInitialized}
        navItems={navItems}
        navAriaLabel={t.navAriaLabel}
      />
      <section className="card read-aloud-card">
        <label className="read-aloud-input-label" htmlFor="read-aloud-input">
          {t.readAloudInputLabel}
        </label>
        <textarea
          id="read-aloud-input"
          className="read-aloud-input"
          value={pastedText}
          onChange={(event) => setPastedText(event.target.value)}
          placeholder={t.readAloudPlaceholder}
          spellCheck={false}
        />
        <div className="read-aloud-toolbar">
          <button
            type="button"
            className="btn-secondary compact"
            onClick={handleClearText}
            disabled={!pastedText}
          >
            {t.readAloudClear}
          </button>
          <span className="read-aloud-stats">
            {t.formatReadAloudStats(ttsSentences.length, wordCount)}
          </span>
        </div>
        <div className="read-aloud-player-sticky">
          <TtsPlayerBar
            isPlaying={isTtsPlaying}
            isIdle={isTtsIdle}
            isRepeat={isTtsRepeat}
            canGoPrev={!isTtsIdle && currentTtsSentenceIndex > TTS_SENTENCE_INDEX_START}
            canGoNext={!isTtsIdle && currentTtsSentenceIndex < ttsSentences.length - 1}
            canPlay={hasSentences}
            voiceList={ttsVoiceList}
            selectedVoiceURI={ttsSelectedVoiceURI}
            onVoiceChange={setTtsSelectedVoiceURI}
            rate={ttsRate}
            rateMin={TTS_RATE_MIN}
            rateMax={TTS_RATE_MAX}
            rateStep={TTS_RATE_STEP}
            rateLabel={t.formatTtsSpeed(ttsRate.toFixed(TTS_RATE_DISPLAY_DECIMALS))}
            onRateChange={handleRateChange}
            progressLabel={
              hasSentences
                ? t.formatTtsSentenceProgress(currentTtsSentenceIndex + 1, ttsSentences.length)
                : EMPTY_STRING
            }
            labels={{
              play: t.ttsPlayerPlay,
              pause: t.ttsPlayerPause,
              stop: t.ttsPlayerStop,
              prev: t.ttsPlayerPrev,
              next: t.ttsPlayerNext,
              repeat: t.ttsPlayerLoop,
              voice: t.ttsVoiceSelectorLabel,
              speed: t.ttsPlayerSpeed,
            }}
            onPlayPause={isTtsPlaying ? handleTtsPause : handleTtsPlay}
            onStop={handleTtsStop}
            onPrev={handleTtsPrev}
            onNext={handleTtsNext}
            onToggleRepeat={toggleTtsRepeat}
          />
        </div>
        <div className="article-text-block read-aloud-preview">
          {hasSentences ? (
            <div className="article-text-content">
              {ttsSentences.map((sentenceObj, sentenceIndex) => {
                const isActive = currentTtsSentenceIndex === sentenceIndex && isTtsPlaying;
                const isParagraphBreak = sentenceObj.separator === PARAGRAPH_BREAK_SEPARATOR;
                const spanClass = [
                  "article-sentence",
                  "read-aloud-sentence",
                  isActive ? "tts-sentence-active" : EMPTY_STRING,
                  isParagraphBreak ? "article-sentence-paragraph-end" : EMPTY_STRING,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <span
                    key={sentenceIndex}
                    data-read-aloud-sentence-index={sentenceIndex}
                    className={spanClass}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSentenceActivate(sentenceIndex)}
                    onKeyDown={(event) => {
                      if (event.key === KEY_ENTER || event.key === KEY_SPACE) {
                        event.preventDefault();
                        handleSentenceActivate(sentenceIndex);
                      }
                    }}
                    title={t.readAloudPlaySentence}
                  >
                    <span className="sentence-prefix">
                      <span className="sentence-number">{sentenceIndex + 1}.</span>
                    </span>
                    <span className="sentence-body">{sentenceObj.text}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="comparison-empty-state">{t.readAloudEmpty}</div>
          )}
        </div>
      </section>
    </main>
  );
}
