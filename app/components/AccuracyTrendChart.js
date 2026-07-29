const CHART_VIEWBOX_WIDTH = 300;
const CHART_VIEWBOX_HEIGHT = 100;
const CHART_PADDING_Y = 10;
const ACCURACY_MIN_PERCENT = 0;
const ACCURACY_MAX_PERCENT = 100;
const ACCURACY_LEVEL_GOOD_THRESHOLD = 80;
const ACCURACY_LEVEL_FAIR_THRESHOLD = 50;
const SINGLE_POINT_X_RATIO = 0.5;
const CHART_POINT_RADIUS = 3;

function getAccuracyLevelClassName(accuracyPercent) {
  if (accuracyPercent >= ACCURACY_LEVEL_GOOD_THRESHOLD) return "accuracy-level-good";
  if (accuracyPercent >= ACCURACY_LEVEL_FAIR_THRESHOLD) return "accuracy-level-fair";
  return "accuracy-level-poor";
}

function mapAccuracyToY(accuracyPercent) {
  const usableHeight = CHART_VIEWBOX_HEIGHT - CHART_PADDING_Y * 2;
  const ratio = (accuracyPercent - ACCURACY_MIN_PERCENT) / (ACCURACY_MAX_PERCENT - ACCURACY_MIN_PERCENT);
  return CHART_VIEWBOX_HEIGHT - CHART_PADDING_Y - ratio * usableHeight;
}

function mapIndexToX(index, totalCount) {
  if (totalCount <= 1) return CHART_VIEWBOX_WIDTH * SINGLE_POINT_X_RATIO;
  return (index / (totalCount - 1)) * CHART_VIEWBOX_WIDTH;
}

/**
 * Simple accuracy trend line chart covering a sentence's full practice
 * history. The overall accuracy number above the chart is color-coded
 * (green / yellow / red) so progress is readable at a glance.
 */
export default function AccuracyTrendChart({ overallAccuracyPercent, attempts, title, noDataText }) {
  const hasAttempts = attempts.length > 0;
  const linePoints = attempts
    .map((attempt, index) => `${mapIndexToX(index, attempts.length)},${mapAccuracyToY(attempt.accuracyPercent)}`)
    .join(" ");

  return (
    <div className="accuracy-trend-panel">
      <div className="accuracy-trend-header">
        <span className="accuracy-trend-title">{title}</span>
        {overallAccuracyPercent !== null ? (
          <span className={`accuracy-trend-overall ${getAccuracyLevelClassName(overallAccuracyPercent)}`}>
            {overallAccuracyPercent}%
          </span>
        ) : null}
      </div>
      {hasAttempts ? (
        <svg
          className="accuracy-trend-svg"
          viewBox={`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline className="accuracy-trend-line" fill="none" points={linePoints} />
          {attempts.map((attempt, index) => (
            <circle
              key={`${attempt.createdAt}-${index}`}
              className="accuracy-trend-dot"
              cx={mapIndexToX(index, attempts.length)}
              cy={mapAccuracyToY(attempt.accuracyPercent)}
              r={CHART_POINT_RADIUS}
            />
          ))}
        </svg>
      ) : (
        <div className="accuracy-trend-empty">{noDataText}</div>
      )}
    </div>
  );
}
