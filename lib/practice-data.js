const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const EASE_BONUS_ON_SUCCESS = 0.1;
const EASE_PENALTY_ON_FAIL = 0.2;
const FIRST_SUCCESS_INTERVAL_DAYS = 1;
const SECOND_SUCCESS_INTERVAL_DAYS = 3;
const INITIAL_REPETITIONS = 0;
const INITIAL_SUCCESS_COUNT = 0;
const INITIAL_FAIL_COUNT = 0;
const INITIAL_INTERVAL_DAYS = 0;
const PERCENT_MAX = 100;
const PERCENT_MIN = 0;

function clampPercent(value) {
  if (Number.isNaN(value)) return PERCENT_MIN;
  return Math.min(PERCENT_MAX, Math.max(PERCENT_MIN, Math.round(value)));
}

function addDays(baseDate, days) {
  return new Date(baseDate.getTime() + days * MS_PER_DAY);
}

/**
 * 簡化版 SM-2：對了拉長間隔，錯了回到隔天複習。
 */
export function buildNextSrsState(existingCard, isCorrect, sentenceText, now = new Date()) {
  const previousEase = Number(existingCard?.ease_factor ?? DEFAULT_EASE_FACTOR);
  const previousRepetitions = Number(existingCard?.repetitions ?? INITIAL_REPETITIONS);
  const previousSuccessCount = Number(existingCard?.success_count ?? INITIAL_SUCCESS_COUNT);
  const previousFailCount = Number(existingCard?.fail_count ?? INITIAL_FAIL_COUNT);
  const previousInterval = Number(existingCard?.interval_days ?? INITIAL_INTERVAL_DAYS);

  if (!isCorrect) {
    return {
      sentence_text: sentenceText,
      ease_factor: Math.max(MIN_EASE_FACTOR, previousEase - EASE_PENALTY_ON_FAIL),
      interval_days: FIRST_SUCCESS_INTERVAL_DAYS,
      repetitions: INITIAL_REPETITIONS,
      success_count: previousSuccessCount,
      fail_count: previousFailCount + 1,
      due_at: addDays(now, FIRST_SUCCESS_INTERVAL_DAYS).toISOString(),
      last_practiced_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  const nextRepetitions = previousRepetitions + 1;
  let nextIntervalDays = FIRST_SUCCESS_INTERVAL_DAYS;

  if (nextRepetitions === 1) {
    nextIntervalDays = FIRST_SUCCESS_INTERVAL_DAYS;
  } else if (nextRepetitions === 2) {
    nextIntervalDays = SECOND_SUCCESS_INTERVAL_DAYS;
  } else {
    nextIntervalDays = Math.max(
      FIRST_SUCCESS_INTERVAL_DAYS,
      Math.round(previousInterval * previousEase)
    );
  }

  return {
    sentence_text: sentenceText,
    ease_factor: previousEase + EASE_BONUS_ON_SUCCESS,
    interval_days: nextIntervalDays,
    repetitions: nextRepetitions,
    success_count: previousSuccessCount + 1,
    fail_count: previousFailCount,
    due_at: addDays(now, nextIntervalDays).toISOString(),
    last_practiced_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/**
 * The full sentence string is the identity of a sentence across the whole
 * app. The same wording can appear in several different Task 2 "articles"
 * (core patterns / by section / by function / by dimension all reuse the
 * same underlying CSV rows), so a position-based key such as
 * `articleId::essayIndex::sentenceIndex` would treat one sentence as many
 * unrelated ones. Normalising and using the sentence text itself avoids
 * that split.
 */
export function normalizeSentenceKey(sentenceText) {
  return (sentenceText ?? "").trim();
}

export function createFavoriteKey(sentenceText) {
  return normalizeSentenceKey(sentenceText);
}

export async function fetchFavoriteSentenceKeys(supabase, userId) {
  const { data, error } = await supabase
    .from("favorite_sentences")
    .select("sentence_text")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const favoriteKeySet = new Set();
  (data ?? []).forEach((row) => {
    favoriteKeySet.add(createFavoriteKey(row.sentence_text));
  });
  return favoriteKeySet;
}

export async function addFavoriteSentence(supabase, payload) {
  const { error } = await supabase.from("favorite_sentences").upsert(
    {
      user_id: payload.userId,
      sentence_text: normalizeSentenceKey(payload.sentenceText),
    },
    { onConflict: "user_id,sentence_text" }
  );

  if (error) {
    throw error;
  }
}

export async function removeFavoriteSentence(supabase, payload) {
  const { error } = await supabase
    .from("favorite_sentences")
    .delete()
    .eq("user_id", payload.userId)
    .eq("sentence_text", normalizeSentenceKey(payload.sentenceText));

  if (error) {
    throw error;
  }
}

export async function recordPracticeAttempt(supabase, payload) {
  const { error } = await supabase.from("practice_attempts").insert({
    user_id: payload.userId,
    sentence_text: normalizeSentenceKey(payload.sentenceText),
    practice_mode: payload.practiceMode,
    is_correct: payload.isCorrect,
    accuracy_percent: clampPercent(payload.accuracyPercent),
    wrong_count: payload.wrongCount,
  });

  if (error) {
    throw error;
  }
}

export async function upsertSrsCardAfterAttempt(supabase, payload) {
  const sentenceText = normalizeSentenceKey(payload.sentenceText);

  const { data: existingCard, error: selectError } = await supabase
    .from("srs_cards")
    .select("*")
    .eq("user_id", payload.userId)
    .eq("sentence_text", sentenceText)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  const nextState = buildNextSrsState(existingCard, payload.isCorrect, sentenceText);

  const { error: upsertError } = await supabase.from("srs_cards").upsert(
    {
      user_id: payload.userId,
      ...nextState,
    },
    { onConflict: "user_id,sentence_text" }
  );

  if (upsertError) {
    throw upsertError;
  }

  return nextState;
}
