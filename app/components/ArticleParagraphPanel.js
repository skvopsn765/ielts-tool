const FIRST_DISPLAY_INDEX = 1;

export default function ArticleParagraphPanel({
  title,
  hintText,
  paragraphGroups,
  activeSentenceIndex,
  selectedSentenceMap,
  formatParagraphLabel,
}) {
  if (!paragraphGroups || paragraphGroups.length === 0) {
    return null;
  }

  return (
    <section className="article-paragraph-panel" aria-label={title}>
      <div className="article-paragraph-header">
        <div className="article-paragraph-title">{title}</div>
        <div className="article-paragraph-hint">{hintText}</div>
      </div>
      <div className="article-paragraph-list">
        {paragraphGroups.map((group) => {
          const paragraphLabel = formatParagraphLabel(group.paragraphIndex + FIRST_DISPLAY_INDEX);
          return (
            <article key={`paragraph-${group.paragraphIndex}`} className="article-paragraph-item">
              <div className="article-paragraph-index">{paragraphLabel}</div>
              <div className="article-paragraph-sentences">
                {group.sentences.map((sentenceInfo) => {
                  const isActive = sentenceInfo.sentenceIndex === activeSentenceIndex;
                  const isSelected = Boolean(selectedSentenceMap?.[sentenceInfo.sentenceIndex]);
                  const className = [
                    "article-paragraph-sentence",
                    isActive ? "active" : "",
                    isSelected ? "selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <span key={`paragraph-sentence-${sentenceInfo.sentenceIndex}`} className={className}>
                      <span className="article-paragraph-sentence-index">
                        {sentenceInfo.sentenceIndex + FIRST_DISPLAY_INDEX}.
                      </span>
                      <span className="article-paragraph-sentence-text">{sentenceInfo.sentence}</span>
                    </span>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
