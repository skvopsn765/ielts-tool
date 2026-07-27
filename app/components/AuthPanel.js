"use client";

import { useEffect, useState } from "react";

const AUTH_STATUS_LOADING = "loading";
const AUTH_STATUS_READY = "ready";
const AUTH_STATUS_UNCONFIGURED = "unconfigured";
const EMPTY_STRING = "";
const EMAIL_INPUT_TYPE = "email";

export default function AuthPanel({
  supabase,
  isConfigured,
  user,
  isAuthLoading,
  authMessage,
  onSignInWithEmail,
  onSignOut,
  labels,
}) {
  const [email, setEmail] = useState(EMPTY_STRING);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authMessage) return;
    setIsSubmitting(false);
  }, [authMessage]);

  if (!isConfigured) {
    return (
      <div className="auth-panel auth-panel-warning" role="status">
        <span className="auth-panel-label">{labels.notConfigured}</span>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="auth-panel" role="status" data-status={AUTH_STATUS_LOADING}>
        <span className="auth-panel-label">{labels.loading}</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-panel" data-status={AUTH_STATUS_READY}>
        <span className="auth-panel-email" title={user.email}>
          {user.email}
        </span>
        <button className="btn-ghost compact" type="button" onClick={onSignOut}>
          {labels.signOut}
        </button>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await onSignInWithEmail(email.trim());
    setIsSubmitting(false);
  }

  return (
    <div className="auth-panel" data-status={AUTH_STATUS_UNCONFIGURED}>
      <form className="auth-panel-form" onSubmit={handleSubmit}>
        <input
          type={EMAIL_INPUT_TYPE}
          className="auth-panel-email-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={labels.emailPlaceholder}
          aria-label={labels.emailPlaceholder}
          autoComplete="email"
          required
          disabled={isSubmitting || !supabase}
        />
        <button
          className="btn-secondary compact"
          type="submit"
          disabled={isSubmitting || !supabase}
        >
          {isSubmitting ? labels.sendingMagicLink : labels.signInWithEmail}
        </button>
      </form>
      {authMessage ? <p className="auth-panel-message">{authMessage}</p> : null}
    </div>
  );
}
