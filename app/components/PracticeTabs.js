const KEY_ARROW_LEFT = "ArrowLeft";
const KEY_ARROW_RIGHT = "ArrowRight";
const KEY_HOME = "Home";
const KEY_END = "End";

export default function PracticeTabs({
  activePracticeTab,
  singleTabValue,
  multiTabValue,
  singleTabLabel,
  multiTabLabel,
  onTabChange,
  tabAriaLabel,
  singleButtonId,
  multiButtonId,
  singlePanelId,
  multiPanelId,
}) {
  const tabOrder = [singleTabValue, multiTabValue];

  function moveTabFocus(currentTab, direction) {
    const currentIndex = tabOrder.indexOf(currentTab);
    const nextIndex = (currentIndex + direction + tabOrder.length) % tabOrder.length;
    const nextTab = tabOrder[nextIndex];
    onTabChange(nextTab);
  }

  function handleTabKeyDown(event) {
    if (event.key === KEY_ARROW_LEFT) {
      event.preventDefault();
      moveTabFocus(activePracticeTab, -1);
      return;
    }
    if (event.key === KEY_ARROW_RIGHT) {
      event.preventDefault();
      moveTabFocus(activePracticeTab, 1);
      return;
    }
    if (event.key === KEY_HOME) {
      event.preventDefault();
      onTabChange(singleTabValue);
      return;
    }
    if (event.key === KEY_END) {
      event.preventDefault();
      onTabChange(multiTabValue);
    }
  }

  return (
    <div className="practice-tab-bar" role="tablist" aria-label={tabAriaLabel}>
      <button
        id={singleButtonId}
        role="tab"
        className={`practice-tab-button ${activePracticeTab === singleTabValue ? "active" : ""}`}
        onClick={() => onTabChange(singleTabValue)}
        aria-selected={activePracticeTab === singleTabValue}
        aria-controls={singlePanelId}
        tabIndex={activePracticeTab === singleTabValue ? 0 : -1}
        onKeyDown={handleTabKeyDown}
      >
        {singleTabLabel}
      </button>
      <button
        id={multiButtonId}
        role="tab"
        className={`practice-tab-button ${activePracticeTab === multiTabValue ? "active" : ""}`}
        onClick={() => onTabChange(multiTabValue)}
        aria-selected={activePracticeTab === multiTabValue}
        aria-controls={multiPanelId}
        tabIndex={activePracticeTab === multiTabValue ? 0 : -1}
        onKeyDown={handleTabKeyDown}
      >
        {multiTabLabel}
      </button>
    </div>
  );
}
