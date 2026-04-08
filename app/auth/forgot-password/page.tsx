"use client";

import { useState } from "react";
import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { AppShell } from "@/components/layout/AppShell";

type Step = "email" | "otp" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendCode = async () => {
    setError(null);
    if (!email.trim()) { setError("Enter your email address."); return; }
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { success: boolean; message?: string };
      if (data.success) {
        setInfo("If an account exists, a reset code has been sent to your email.");
        setStep("otp");
      } else {
        setError(data.message ?? "Failed to send reset code.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    if (!otp.trim()) { setError("Enter the 6-digit OTP."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json() as { success: boolean; message?: string };
      if (data.success) {
        setStep("done");
        setInfo("Password reset successfully!");
      } else {
        setError(data.message ?? "Failed to reset password.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell activeNav="account">
      <div className="page-shell page-shell--narrow">
        <AuthCard title="Reset Password">
          {error && (
            <div style={{ padding: "0.75rem 1rem", background: "var(--color-accent)", color: "var(--color-paper)", marginBottom: "1rem", fontSize: "0.88rem" }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ padding: "0.75rem 1rem", background: "var(--color-olive)", color: "var(--color-paper)", marginBottom: "1rem", fontSize: "0.88rem" }}>
              {info}
            </div>
          )}

          {step === "email" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              <p className="section-copy">Enter your registered email. We&apos;ll send a 6-digit code to reset your password.</p>
              <label className="auth-label">
                Email
                <input
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={isSubmitting}
                onClick={() => void handleSendCode()}
              >
                {isSubmitting ? "Sending..." : "Send Reset Code"}
              </button>
              <Link href="/auth/login" className="btn-secondary" style={{ textAlign: "center" }}>
                ← Back to Login
              </Link>
            </div>
          )}

          {step === "otp" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              <p className="section-copy">Enter the 6-digit code sent to <strong>{email}</strong> and your new password.</p>
              <label className="auth-label">
                OTP Code
                <input
                  type="text"
                  className="auth-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                />
              </label>
              <label className="auth-label">
                New Password
                <input
                  type="password"
                  className="auth-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </label>
              <label className="auth-label">
                Confirm Password
                <input
                  type="password"
                  className="auth-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={isSubmitting}
                onClick={() => void handleResetPassword()}
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void handleSendCode()}
                disabled={isSubmitting}
              >
                Resend Code
              </button>
            </div>
          )}

          {step === "done" && (
            <div style={{ display: "grid", gap: "1rem", textAlign: "center" }}>
              <p style={{ fontSize: "3rem" }}>✅</p>
              <p className="section-copy">Your password has been reset. Sign in with your new password.</p>
              <Link href="/auth/login" className="btn-primary" style={{ textAlign: "center" }}>
                Sign In
              </Link>
            </div>
          )}
        </AuthCard>
      </div>
    </AppShell>
  );
}
