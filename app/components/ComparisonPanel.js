const SPACE_CHAR = " ";
const NON_BREAKING_SPACE = "\u00A0";
const SEGMENT_TYPE_BREAK = "break";

function toDisplayText(text) {
  return text.replace(/ /g, NON_BREAKING_SPACE);
}

export default function ComparisonPanel({ panelRef, segments }) {
  if (!segments || segments.length === 0) return null;

  return (
    <div ref={panelRef} className="comparison-panel" aria-live="polite">
      <div className="comparison-content unified-diff">
        {segments.map((segment, index) => {
          if (segment.type === SEGMENT_TYPE_BREAK) {
            return <br key={`brk-${index}`} />;
          }

          if (!segment.hasError) {
            const text = toDisplayText(segment.actualText || segment.expectedText);
            return <span key={`ok-${index}`}>{text}</span>;
          }

          const parts = [];
          if (segment.actualText) {
            parts.push(
              <span key={`del-${index}`} className="token-deleted">
                {toDisplayText(segment.actualText)}
              </span>
            );
          }
          if (segment.expectedText) {
            parts.push(
              <span key={`ins-${index}`} className="token-inserted">
                {toDisplayText(segment.expectedText)}
              </span>
            );
          }
          return parts;
        })}
      </div>
    </div>
  );
}
