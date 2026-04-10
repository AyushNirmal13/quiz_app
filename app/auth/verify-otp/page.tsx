"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { AppShell } from "@/components/layout/AppShell";
import { fetchCurrentUser, storeAuthUser } from "@/lib/auth-client";
import type { AuthUser } from "@/types/auth";

interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
}

function AuthPageFallback() {
  return (
    <AppShell activeNav="account">
      <div className="page-shell page-shell--narrow" />
    </AppShell>
  );
}

function VerifyOtpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>("Enter the OTP sent to your email.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const queryEmail = searchParams.get("email");

    if (queryEmail) {
      setEmail(queryEmail);
      setInfoMessage("Enter the OTP sent to your email.");
      return;
    }

    setInfoMessage("Registration email is missing. Go back to register and request a new OTP.");
  }, [searchParams]);

  useEffect(() => {
    let isActive = true;

    const redirectAuthenticatedUser = async () => {
      const user = await fetchCurrentUser();

      if (!isActive || !user) {
        return;
      }

      router.replace("/dashboard");
    };

    void redirectAuthenticatedUser();

    return () => {
      isActive = false;
    };
  }, [router]);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      setErrorMessage("Registration email is missing. Register again to continue.");
      setInfoMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = (await response.json()) as VerifyOtpResponse;

      if (!response.ok || !data.success || !data.user) {
        setErrorMessage(data.message ?? "Unable to verify OTP right now.");
        return;
      }

      storeAuthUser(data.user);
      // Use hard navigation to ensure layout/session caches are busted
      window.location.href = "/dashboard";
    } catch {
      setErrorMessage("Unable to verify OTP right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell activeNav="account">
      <div className="page-shell page-shell--narrow">
        <AuthCard
          title="Verify your email."
          description="Complete the OTP step to activate your Quiz Central account and unlock the right dashboard."
          actionLabel={isSubmitting ? "Verifying..." : "Verify OTP"}
          footerText="Already verified?"
          footerHref="/auth/login"
          footerLinkLabel="Sign in"
          onSubmit={handleVerify}
          submitDisabled={isSubmitting || !email}
        >
          {infoMessage ? <p className="section-copy">{infoMessage}</p> : null}
          {errorMessage ? <p className="section-copy">{errorMessage}</p> : null}

          <label className="form-field">
            <span className="form-field__label">Email</span>
            <input
              className="form-field__input"
              type="email"
              placeholder="name@institution.edu"
              value={email}
              readOnly
              required
            />
          </label>

          <label className="form-field">
            <span className="form-field__label">OTP</span>
            <input
              className="form-field__input"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              required
            />
          </label>
        </AuthCard>
      </div>
    </AppShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <VerifyOtpPageContent />
    </Suspense>
  );
}
