export default function Task2CheatSheet({ groups, getGroupLabel, title, closeLabel, onClose }) {
  return (
    <section className="task2-cheat-sheet" aria-label={title}>
      <div className="task2-cheat-sheet-header">
        <h3 className="task2-cheat-sheet-title">{title}</h3>
        <button type="button" className="btn-ghost compact" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
      {groups.map((group) => (
        <div key={group.typeId} className="task2-cheat-sheet-group">
          <div className="task2-cheat-sheet-group-title">{getGroupLabel(group.typeId)}</div>
          <ul className="task2-cheat-sheet-list">
            {group.rows.map((row, index) => (
              <li key={`${group.typeId}-${row.slot}-${index}`} className="task2-cheat-sheet-item">
                <span className="task2-cheat-sheet-slot">{row.slot}</span>
                <span className="task2-cheat-sheet-text">{row.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
