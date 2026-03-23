export default function ComparisonLegend({ legendItems }) {
  return (
    <div className="legend" role="list">
      {legendItems.map((item) => (
        <span key={item.id} className="legend-item" role="listitem">
          <i className={`dot ${item.dotClassName}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
