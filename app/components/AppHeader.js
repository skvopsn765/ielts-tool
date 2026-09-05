"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGES } from "../i18n";
import AuthPanel from "./AuthPanel";

const DEFAULT_KICKER = "IELTS Writing Task 1";
const EMPTY_NAV_ITEMS = [];

export default function AppHeader({
  title,
  introHint,
  language,
  onLanguageChange,
  languageSwitchAria,
  langReady,
  authProps = null,
  kicker = DEFAULT_KICKER,
  navItems = EMPTY_NAV_ITEMS,
  navAriaLabel,
}) {
  const hasAuthPanel = authProps !== null;
  const pathname = usePathname();

  return (
    <header className="card app-header-card">
      <div className="card-header app-header-top">
        <div className="app-title-group">
          <p className="app-kicker">{kicker}</p>
          <h1 className="app-title">{title}</h1>
          {navItems.length > 0 && (
            <nav className="app-nav" aria-label={navAriaLabel}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`app-nav-link ${isActive ? "active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
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
