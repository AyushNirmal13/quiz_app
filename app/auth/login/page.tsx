"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import {
  clearStoredAuthUser,
  fetchCurrentUser,
  storeAuthUser,
} from "@/lib/auth-client";
import type { AuthUser } from "@/types/auth";

interface LoginResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
  isNew?: boolean;
  profile?: { email: string; name: string };
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info] = useState<string | null>(
    searchParams.get("verified") === "1" ? "Email verified. Sign in to continue." : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    let active = true;
    void fetchCurrentUser().then((user) => {
      if (active && user) router.replace("/dashboard");
    });
    return () => { active = false; };
  }, [router]);

  // Load Google Identity Services
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const handleCredential = async (response: { credential: string }) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = (await res.json()) as LoginResponse;

        if (!res.ok || !data.success) {
          setError(data.message ?? "Google sign-in failed.");
          return;
        }



        if (data.user) {
          storeAuthUser(data.user);
          // Use hard navigation to ensure layout/session caches are busted
          window.location.href = "/dashboard";
        }
      } catch {
        setError("Google sign-in failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const g = (window as unknown as Record<string, unknown>).google as {
        accounts: { id: { initialize: (o: unknown) => void; renderButton: (el: Element, o: unknown) => void } };
      } | undefined;
      if (!g || !googleBtnRef.current) return;
      g.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      g.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: googleBtnRef.current.offsetWidth || 400,
        text: "signin_with",
      });
      setGoogleAvailable(true);
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch { /* ignore */ } };
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as LoginResponse;

      if (!res.ok || !data.success || !data.user) {
        clearStoredAuthUser();
        setError(data.message ?? "Unable to sign in.");
        return;
      }

      storeAuthUser(data.user);
      // Use hard navigation to ensure layout/session caches are busted
      window.location.href = "/dashboard";
    } catch {
      clearStoredAuthUser();
      setError("Unable to sign in right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell activeNav="account">
      <div className="page-shell page-shell--narrow">
        <section className="auth-shell">
          <div className="auth-card">
            <header className="content-card__header">
              <p className="eyebrow">Access portal</p>
              <h1 className="auth-card__title">Sign in to Quiz Central.</h1>
              <p className="auth-card__copy">
                Students and teachers both sign in here. You&apos;ll be routed to the right dashboard automatically.
              </p>
            </header>

            {info && <p className="section-copy" style={{ color: "var(--color-olive)" }}>{info}</p>}
            {error && <p className="section-copy" style={{ color: "var(--color-accent)" }}>{error}</p>}

            <form className="auth-form" onSubmit={(e) => void handleLogin(e)}>
              <label className="form-field">
                <span className="form-field__label">Email</span>
                <input
                  className="form-field__input"
                  type="email"
                  placeholder="name@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="form-field">
                <span className="form-field__label">Password</span>
                <input
                  className="form-field__input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              <div style={{ textAlign: "right", marginTop: "-0.5rem" }}>
                <Link href="/auth/forgot-password" style={{ fontSize: "0.82rem", color: "var(--color-accent)" }}>
                  Forgot password?
                </Link>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: "100%" }}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>

            {/* Google Sign-In */}
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1, height: "1px", background: "var(--color-ink)" }} />
                  <span style={{ fontFamily: "var(--font-label), monospace", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>or</span>
                  <div style={{ flex: 1, height: "1px", background: "var(--color-ink)" }} />
                </div>

                {/* Loading placeholder — a SIBLING of the ref div, never inside it.
                    Google SDK replaces the ref div's innerHTML, which would cause
                    React's removeChild to crash if we put anything inside it. */}
                {!googleAvailable && (
                  <button type="button" className="btn-secondary" style={{ width: "100%" }} disabled>
                    Loading Google Sign‑In…
                  </button>
                )}

                {/* Google renders its button into this div — must stay empty */}
                <div ref={googleBtnRef} style={{ minHeight: googleAvailable ? "44px" : "0" }} />
              </div>
            )}

            <p className="auth-switch">
              Need an account?{" "}
              <a href="/auth/register" style={{ textDecoration: "underline", textUnderlineOffset: "0.2rem" }}>
                Register here
              </a>
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AppShell activeNav="account"><div className="page-shell page-shell--narrow" /></AppShell>}>
      <LoginPageContent />
    </Suspense>
  );
}
