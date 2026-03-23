export default function ComparisonLegend({ legendItems }) {
  return (
    <div className="legend">
      {legendItems.map((item) => (
        <span key={item.id}>
          <i className={`dot ${item.dotClassName}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
