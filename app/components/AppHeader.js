import { LANGUAGES } from "../i18n";

export default function AppHeader({ title, introHint, language, onLanguageChange, languageSwitchAria }) {
  return (
    <div className="card">
      <div className="card-header">
        <h1 className="app-title">{title}</h1>
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
      </div>
      <p className="hint">{introHint}</p>
    </div>
  );
}
