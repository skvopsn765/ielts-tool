export default function MultiSentenceChecklist({
  sentences,
  selectedSentenceMap,
  onToggleSentence,
  itemKeyPrefix,
}) {
  return (
    <div className="multi-sentence-list">
      {sentences.map((sentence, index) => {
        const isChecked = Boolean(selectedSentenceMap[index]);
        const displayIndex = index + 1;

        return (
          <label key={`${itemKeyPrefix}-${index}`} className="multi-sentence-item">
            <input type="checkbox" checked={isChecked} onChange={() => onToggleSentence(index)} />
            <span className="multi-sentence-index">{displayIndex}.</span>
            <span className="multi-sentence-text">{sentence}</span>
          </label>
        );
      })}
    </div>
  );
}
