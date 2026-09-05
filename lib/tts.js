const TTS_LANG_PREFERRED = "en-GB";
const TTS_LANG_FALLBACK_PREFIX = "en";
const TTS_STATE_IDLE = "idle_tts";
const TTS_STATE_PLAYING = "playing";
const TTS_STATE_PAUSED = "paused";
const TTS_ERROR_INTERRUPTED = "interrupted";
const TTS_ERROR_CANCELED = "canceled";
const TTS_SENTENCE_INDEX_START = 0;
const TTS_RATE_MIN = 0.5;
const TTS_RATE_MAX = 2;
const TTS_RATE_DEFAULT = 1;
const TTS_RATE_STEP = 0.1;
const TTS_RATE_DISPLAY_DECIMALS = 1;
const VOICE_LOAD_RETRY_INTERVAL_MS = 300;
const VOICE_LOAD_RETRY_MAX_ATTEMPTS = 20;
const WHITESPACE_RE = /\s+/g;
const CARRIAGE_RETURN_RE = /\r\n/g;
const PARAGRAPH_SPLIT_RE = /\n\s*\n/;
const SENTENCE_CHUNK_RE = /[^。！？.!?]+[。！？.!?]+|[^。！？.!?]+$/g;
const PARAGRAPH_BREAK_SEPARATOR = "\n\n";
const SENTENCE_SEPARATOR_SPACE = " ";
const EMPTY_STRING = "";

function filterUkVoiceList(voices) {
  const gbVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(TTS_LANG_PREFERRED.toLowerCase())
  );
  const enVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(TTS_LANG_FALLBACK_PREFIX)
  );
  if (gbVoices.length > 0) return gbVoices;
  if (enVoices.length > 0) return enVoices;
  return voices;
}

function splitPastedArticleIntoSentences(text) {
  if (typeof text !== "string") return [];

  const normalized = text.replace(CARRIAGE_RETURN_RE, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(PARAGRAPH_SPLIT_RE);
  const result = [];

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex].replace(WHITESPACE_RE, " ").trim();
    if (!paragraph) continue;

    const matches = paragraph.match(SENTENCE_CHUNK_RE);
    if (!matches) continue;

    const isLastParagraph = paragraphIndex === paragraphs.length - 1;
    for (let sentenceIndex = 0; sentenceIndex < matches.length; sentenceIndex += 1) {
      const sentenceText = matches[sentenceIndex].trim();
      if (!sentenceText) continue;

      const isLastInParagraph = sentenceIndex === matches.length - 1;
      const separator =
        isLastInParagraph && !isLastParagraph ? PARAGRAPH_BREAK_SEPARATOR : SENTENCE_SEPARATOR_SPACE;
      result.push({ text: sentenceText, separator });
    }
  }

  return result;
}

function countWords(text) {
  if (typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(WHITESPACE_RE).filter(Boolean).length;
}

function clampTtsRate(rate) {
  const numericRate = Number(rate);
  if (!Number.isFinite(numericRate)) return TTS_RATE_DEFAULT;
  return Math.min(TTS_RATE_MAX, Math.max(TTS_RATE_MIN, numericRate));
}

export {
  TTS_LANG_PREFERRED,
  TTS_STATE_IDLE,
  TTS_STATE_PLAYING,
  TTS_STATE_PAUSED,
  TTS_ERROR_INTERRUPTED,
  TTS_ERROR_CANCELED,
  TTS_SENTENCE_INDEX_START,
  TTS_RATE_MIN,
  TTS_RATE_MAX,
  TTS_RATE_DEFAULT,
  TTS_RATE_STEP,
  TTS_RATE_DISPLAY_DECIMALS,
  VOICE_LOAD_RETRY_INTERVAL_MS,
  VOICE_LOAD_RETRY_MAX_ATTEMPTS,
  EMPTY_STRING,
  PARAGRAPH_BREAK_SEPARATOR,
  filterUkVoiceList,
  splitPastedArticleIntoSentences,
  countWords,
  clampTtsRate,
};
