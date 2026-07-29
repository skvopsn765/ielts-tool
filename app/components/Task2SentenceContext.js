const EMPTY_STRING = "";

export default function Task2SentenceContext({
  typeLabel,
  sectionLabel,
  slot,
  noteZh,
  blanks,
  activeToken,
  glossaryText,
  onToggleToken,
  labels,
}) {
  const hasAnyContext = Boolean(typeLabel || sectionLabel || slot || noteZh || blanks.length > 0);
  if (!hasAnyContext) return null;

  return (
    <div className="task2-sentence-context">
      <div className="task2-context-meta">
        {typeLabel ? <span className="task2-context-badge">{typeLabel}</span> : null}
        {sectionLabel ? (
          <span className="task2-context-badge task2-context-badge--muted">{sectionLabel}</span>
        ) : null}
        {slot ? <span className="task2-context-slot">{slot}</span> : null}
      </div>
      {noteZh ? <div className="task2-context-note">{noteZh}</div> : null}
      {blanks.length > 0 ? (
        <div className="task2-blank-chip-row">
          <span className="task2-blank-chip-label">{labels.blanksLabel}</span>
          {blanks.map((token) => (
            <button
              key={token}
              type="button"
              className={`task2-blank-chip ${activeToken === token ? "active" : EMPTY_STRING}`}
              onClick={() => onToggleToken(token)}
              aria-pressed={activeToken === token}
            >
              {token}
            </button>
          ))}
        </div>
      ) : null}
      {activeToken ? (
        <div className="task2-glossary-popover" role="status">
          <strong>{activeToken}</strong>
          {"\u00A0\u2014\u00A0"}
          {glossaryText || labels.glossaryEmpty}
        </div>
      ) : null}
    </div>
  );
}
