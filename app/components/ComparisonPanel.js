export default function ComparisonPanel({ panelRef, title, actualLineTokens, expectedLineTokens }) {
  return (
    <div ref={panelRef} className="comparison-panel" aria-live="polite">
      <div className="comparison-title">{title}</div>
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
  );
}
