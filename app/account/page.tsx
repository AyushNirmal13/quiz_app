"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { fetchCurrentUser, logoutUser } from "@/lib/auth-client";
import type { AuthUser } from "@/types/auth";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    void fetchCurrentUser().then((u) => {
      if (!u) {
        router.replace("/auth/login");
        return;
      }
      setUser(u);
      setIsLoading(false);
    });
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutUser();
    router.replace("/auth/login");
  };

  if (isLoading) {
    return (
      <AppShell activeNav="account">
        <div className="page-shell"><p className="section-copy">Loading...</p></div>
      </AppShell>
    );
  }

  if (!user) return null;

  const rows = [
    { label: "Full Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Verification", value: user.isVerified ? "Email verified ✓" : "Not verified" },
  ];

  return (
    <AppShell activeNav="account">
      <div className="page-shell page-shell--narrow">
        <section className="page-intro">
          <div className="page-intro__top">
            <div className="page-intro__copy">
              <p className="eyebrow">My Account</p>
              <h1 className="page-title">{user.name}</h1>
              <p className="page-lede">{user.email}</p>
            </div>
          </div>
        </section>

        <div className="content-card" style={{ marginBottom: "1.5rem" }}>
          <div className="content-card__header">
            <p className="eyebrow">Profile</p>
            <h2 className="content-card__title">Personal Information</h2>
          </div>
          <dl className="detail-list">
            {rows.map((row) => (
              <div key={row.label} className="detail-list__row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            style={{ background: "var(--color-accent)", borderColor: "var(--color-accent)" }}
          >
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
