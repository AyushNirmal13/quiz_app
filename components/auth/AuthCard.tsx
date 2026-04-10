import type { FormEventHandler, ReactNode } from "react";

import Link from "next/link";

interface AuthCardProps {
  title: string;
  description?: string;
  actionLabel?: string;
  footerText?: string;
  footerHref?: string;
  footerLinkLabel?: string;
  children: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  submitDisabled?: boolean;
}

export function AuthCard({
  title,
  description,
  actionLabel,
  footerText,
  footerHref,
  footerLinkLabel,
  children,
  onSubmit,
  submitDisabled,
}: AuthCardProps) {
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <header className="content-card__header">
          <p className="eyebrow">Access portal</p>
          <h1 className="auth-card__title">{title}</h1>
          {description && <p className="auth-card__copy">{description}</p>}
        </header>

        {onSubmit ? (
          <form className="auth-form" onSubmit={onSubmit}>
            {children}
            {actionLabel && (
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitDisabled}>
                  {actionLabel}
                </button>
              </div>
            )}
          </form>
        ) : (
          <div className="auth-form">
            {children}
          </div>
        )}

        {footerText && footerHref && footerLinkLabel && (
          <p className="auth-switch">
            {footerText} <Link href={footerHref}>{footerLinkLabel}</Link>
          </p>
        )}
      </div>
    </section>
  );
}
