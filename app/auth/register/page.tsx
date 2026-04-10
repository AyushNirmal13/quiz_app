"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { fetchCurrentUser, storeAuthUser } from "@/lib/auth-client";
import type { AuthUser } from "@/types/auth";

interface LoginResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
  isNew?: boolean;
  profile?: { email: string; name: string };
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  email?: string;
  user?: AuthUser;
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const isGoogleFlow = searchParams.get("google") === "1";

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
        text: "signup_with",
      });
      setGoogleAvailable(true);
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch { /* ignore */ } };
  }, [router]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!isGoogleFlow && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        name,
        email,
        password,
        google: isGoogleFlow,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as RegisterResponse;

      if (!res.ok || !data.success || !data.email) {
        setError(data.message ?? "Unable to register right now.");
        return;
      }

      if (isGoogleFlow && data.user) {
        storeAuthUser(data.user);
        window.location.href = "/dashboard";
        return;
      }

      router.replace(`/auth/verify-otp?email=${encodeURIComponent(data.email)}`);
    } catch {
      setError("Unable to register right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    minHeight: "48px",
    padding: "0.85rem 1rem",
    border: "1px solid var(--color-ink)",
    background: "var(--color-paper)",
    width: "100%",
    fontFamily: "inherit",
    color: "var(--color-ink)",
  };

  return (
    <AppShell activeNav="account">
      <div className="page-shell page-shell--narrow">
        <section className="auth-shell" style={{ alignItems: "flex-start", paddingTop: "2rem" }}>
          <div className="auth-card" style={{ width: "min(100%, 680px)" }}>
            <header className="content-card__header">
              <p className="eyebrow">Access portal</p>
              <h1 className="auth-card__title">Create your account.</h1>
              <p className="auth-card__copy">
                Fill in your details to register.
              </p>
            </header>

            {error && <p className="section-copy" style={{ color: "var(--color-accent)" }}>{error}</p>}
            {isGoogleFlow && (
              <p className="section-copy" style={{ color: "var(--color-olive)" }}>
                ✓ Google account verified — complete your profile to continue.
              </p>
            )}

            <form className="auth-form" onSubmit={(e) => void handleRegister(e)}>
              <div className="form-field">
                <span className="form-field__label">Full Name *</span>
                <input style={inputStyle} type="text" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              {/* Email */}
              <div className="form-field">
                <span className="form-field__label">Email Address *</span>
                <input style={inputStyle} type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required readOnly={isGoogleFlow} />
              </div>

              {/* Password — skip for Google flow */}
              {!isGoogleFlow && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-field">
                    <span className="form-field__label">Password *</span>
                    <input style={inputStyle} type="password" placeholder="Min 8 chars, include number & symbol" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  </div>
                  <div className="form-field">
                    <span className="form-field__label">Confirm Password *</span>
                    <input style={inputStyle} type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: "100%" }}>
                  {isSubmitting ? "Creating..." : "Create Account & Verify Email"}
                </button>
              </div>
            </form>

            {/* Google Sign-Up */}
            {!isGoogleFlow && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1, height: "1px", background: "var(--color-ink)" }} />
                  <span style={{ fontFamily: "var(--font-label), monospace", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>or</span>
                  <div style={{ flex: 1, height: "1px", background: "var(--color-ink)" }} />
                </div>

                {!googleAvailable && (
                  <button type="button" className="btn-secondary" style={{ width: "100%" }} disabled>
                    Loading Google Sign‑In…
                  </button>
                )}

                <div ref={googleBtnRef} style={{ minHeight: googleAvailable ? "44px" : "0" }} />
              </div>
            )}

            <p className="auth-switch">
              Already have an account?{" "}
              <a href="/auth/login" style={{ textDecoration: "underline", textUnderlineOffset: "0.2rem" }}>Sign in</a>
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<AppShell activeNav="account"><div className="page-shell" /></AppShell>}>
      <RegisterPageContent />
    </Suspense>
  );
}
