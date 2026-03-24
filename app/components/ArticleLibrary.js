export default function ArticleLibrary({
  title,
  subtitle,
  articleConfigs,
  activeArticleId,
  getArticleLabel,
  getArticleButtonTitle,
  getArticleStateLabel,
  onSelectArticle,
}) {
  return (
    <section className="article-library" aria-label={title}>
      <div className="article-library-header">
        <h2 className="article-library-title">{title}</h2>
        {subtitle ? <div className="article-library-subtitle">{subtitle}</div> : null}
      </div>
      <div className="article-button-grid">
        {articleConfigs.map((articleConfig) => {
          const articleId = articleConfig.id;
          const isArticleEnabled = articleConfig.isEnabled;
          const articleButtonTitle = getArticleButtonTitle(isArticleEnabled);

          return (
            <button
              key={articleId}
              className={`article-btn ${activeArticleId === articleId ? "active" : ""}`}
              onClick={() => onSelectArticle(articleId)}
              title={articleButtonTitle}
              disabled={!isArticleEnabled}
            >
              <span className="article-button-title">{getArticleLabel(articleId)}</span>
              <span className="article-button-meta">
                {getArticleStateLabel(isArticleEnabled)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
