"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/auth-client";

export type NavKey = "dashboard" | "create" | "analytics" | "account" | "records" | "explore" | null;

const NAV_ITEMS = [
  { key: "dashboard" as const, label: "Dashboard", href: "/dashboard" },
  { key: "create" as const, label: "Create Quiz", href: "/create" },
  { key: "records" as const, label: "Records", href: "/results" },
  { key: "account" as const, label: "Account", href: "/account" },
];

interface NavbarProps {
  activeKey?: NavKey;
}

export function Navbar({ activeKey = null }: NavbarProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const homeHref = "/dashboard";

  useEffect(() => {
    let active = true;
    void fetchCurrentUser().then((user) => {
      if (active && user) {
        setIsAuthenticated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link href={homeHref} className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">QC</span>
          <span className="brand-copy">
            <strong>Quiz Central</strong>
            <span>AI Secure Quiz System</span>
          </span>
        </Link>

        {isAuthenticated && (
          <nav className="topbar__nav" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={item.key === activeKey ? "topbar__link topbar__link--active" : "topbar__link"}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
