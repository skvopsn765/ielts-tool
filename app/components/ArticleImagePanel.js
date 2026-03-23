export default function ArticleImagePanel({
  isVisible,
  title,
  isImageUnavailable,
  imageUnavailableText,
  imageUrl,
  imageAlt,
  onImageError,
}) {
  if (!isVisible) return null;

  return (
    <div className="article-image-panel">
      <div className="article-image-title">{title}</div>
      {isImageUnavailable ? (
        <div className="article-image-fallback">{imageUnavailableText}</div>
      ) : (
        <img src={imageUrl} alt={imageAlt} className="article-image-preview" onError={onImageError} />
      )}
    </div>
  );
}
