import { LANGUAGES } from "../i18n";

export default function AppHeader({ title, introHint, language, onLanguageChange, languageSwitchAria, langReady }) {
  return (
    <header className="card app-header-card">
      <div className="card-header app-header-top">
        <div className="app-title-group">
          <p className="app-kicker">IELTS Writing Task 1</p>
          <h1 className="app-title">{title}</h1>
        </div>
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
      <p className="hint app-intro-hint">{introHint}</p>
    </header>
  );
}
