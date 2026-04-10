"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { fetchCurrentUser } from "@/lib/auth-client";

export type NavKey = "dashboard" | "create" | "analytics" | "account" | "records" | "explore" | null;

const NAV_ITEMS = [
  { key: "dashboard" as const, label: "Dashboard", href: "/dashboard" },
  { key: "create" as const, label: "Create Quiz", href: "/create" },
  { key: "records" as const, label: "Records", href: "/results" },
  { key: "analytics" as const, label: "Analytics", href: "/analytics" },
  { key: "account" as const, label: "Account", href: "/account" },
];

interface NavbarProps {
  activeKey?: NavKey;
}

export function Navbar({ activeKey = null }: NavbarProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close menu on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
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
          <>
            {/* Hamburger button — visible only on mobile */}
            <button
              type="button"
              className={`hamburger${menuOpen ? " hamburger--active" : ""}`}
              onClick={toggleMenu}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className="hamburger__line" />
              <span className="hamburger__line" />
              <span className="hamburger__line" />
            </button>

            {/* Overlay backdrop — visible only when menu is open on mobile */}
            {menuOpen && (
              <div
                className="nav-overlay"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Navigation links */}
            <nav
              className={`topbar__nav${menuOpen ? " topbar__nav--open" : ""}`}
              aria-label="Primary navigation"
            >
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={item.key === activeKey ? "topbar__link topbar__link--active" : "topbar__link"}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </>
        )}
      </div>
    </header>
  );
}
