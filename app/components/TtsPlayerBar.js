"use client";

const ICON_SIZE = 18;

function RepeatIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}

function PrevIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 19 2 12 11 5 11 19" />
      <polygon points="22 19 13 12 22 5 22 19" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="13 19 22 12 13 5 13 19" />
      <polygon points="2 19 11 12 2 5 2 19" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

export default function TtsPlayerBar({
  isPlaying,
  isIdle,
  isRepeat,
  canGoPrev,
  canGoNext,
  canPlay,
  voiceList,
  selectedVoiceURI,
  onVoiceChange,
  rate,
  rateMin,
  rateMax,
  rateStep,
  rateLabel,
  onRateChange,
  progressLabel,
  labels,
  onPlayPause,
  onStop,
  onPrev,
  onNext,
  onToggleRepeat,
}) {
  return (
    <div className="tts-player-bar">
      <button
        type="button"
        className={`tts-player-btn ${isRepeat ? "active" : ""}`}
        onClick={onToggleRepeat}
        aria-label={labels.repeat}
        aria-pressed={isRepeat}
        title={labels.repeat}
      >
        <RepeatIcon />
      </button>
      <button
        type="button"
        className="tts-player-btn"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label={labels.prev}
        title={labels.prev}
      >
        <PrevIcon />
      </button>
      <button
        type="button"
        className={`tts-player-btn ${isPlaying ? "active" : ""}`}
        onClick={onPlayPause}
        disabled={!canPlay}
        aria-label={isPlaying ? labels.pause : labels.play}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        className="tts-player-btn"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label={labels.next}
        title={labels.next}
      >
        <NextIcon />
      </button>
      <button
        type="button"
        className="tts-player-btn"
        onClick={onStop}
        disabled={isIdle}
        aria-label={labels.stop}
      >
        <StopIcon />
      </button>
      <select
        className="tts-player-voice-select"
        value={selectedVoiceURI}
        onChange={(event) => onVoiceChange(event.target.value)}
        aria-label={labels.voice}
      >
        {voiceList.map((voice) => (
          <option key={voice.voiceURI} value={voice.voiceURI}>
            {voice.name}
          </option>
        ))}
      </select>
      <label className="tts-player-speed">
        <span className="tts-player-speed-label">{labels.speed}</span>
        <input
          type="range"
          className="tts-player-speed-slider"
          min={rateMin}
          max={rateMax}
          step={rateStep}
          value={rate}
          onChange={(event) => onRateChange(Number(event.target.value))}
          aria-label={labels.speed}
        />
        <span className="tts-player-speed-value">{rateLabel}</span>
      </label>
      {progressLabel ? <span className="tts-player-progress">{progressLabel}</span> : null}
    </div>
  );
}
