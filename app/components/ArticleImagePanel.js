export default function ArticleImagePanel({
  isVisible,
  title,
  isImageUnavailable,
  imageUnavailableText,
  imageUrls,
  imageAlt,
  onImageError,
  isExpanded,
  onToggleExpanded,
  collapseLabel,
  expandLabel,
}) {
  if (!isVisible) return null;

  return (
    <div className="article-image-panel">
      <div className="article-image-header">
        <div className="article-image-title">{title}</div>
        <button className="btn-ghost compact" onClick={onToggleExpanded}>
          {isExpanded ? collapseLabel : expandLabel}
        </button>
      </div>
      <div className={`article-image-collapse ${isExpanded ? "expanded" : ""}`}>
        {isImageUnavailable ? (
          <div className="article-image-fallback">{imageUnavailableText}</div>
        ) : (
          imageUrls.map((url, index) => (
            <img
              key={url}
              src={url}
              alt={imageUrls.length > 1 ? `${imageAlt} (${index + 1})` : imageAlt}
              className="article-image-preview"
              onError={onImageError}
            />
          ))
        )}
      </div>
    </div>
  );
}
