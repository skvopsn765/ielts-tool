import { LANGUAGES } from "../i18n";
import AuthPanel from "./AuthPanel";

export default function AppHeader({
  title,
  introHint,
  language,
  onLanguageChange,
  languageSwitchAria,
  langReady,
  authProps = null,
}) {
  const hasAuthPanel = authProps !== null;

  return (
    <header className="card app-header-card">
      <div className="card-header app-header-top">
        <div className="app-title-group">
          <p className="app-kicker">IELTS Writing Task 1</p>
          <h1 className="app-title">{title}</h1>
        </div>
        <div className="app-header-actions">
          {hasAuthPanel ? (
            <AuthPanel
              supabase={authProps.supabase}
              isConfigured={authProps.isConfigured}
              user={authProps.user}
              isAuthLoading={authProps.isAuthLoading}
              authMessage={authProps.authMessage}
              onSignInWithEmail={authProps.onSignInWithEmail}
              onSignOut={authProps.onSignOut}
              labels={authProps.labels}
            />
          ) : null}
          {langReady && (
            <div className="language-switch" role="group" aria-label={languageSwitchAria}>
              {LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  className={`language-switch-button ${language === item.id ? "active" : ""}`}
                  onClick={() => onLanguageChange(item.id)}
                  disabled={language === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="hint app-intro-hint">{introHint}</p>
    </header>
  );
}
