import type { AuthUser } from "@/types/auth";

const AUTH_USER_KEY = "quiz_auth_user";

let cachedAuthUser: AuthUser | null = null;

export function storeAuthUser(user: AuthUser): void {
  cachedAuthUser = user;
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearStoredAuthUser(): void {
  cachedAuthUser = null;
  try {
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // ignore
  }
}

function loadStoredAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (cachedAuthUser) return cachedAuthUser;

  const stored = loadStoredAuthUser();
  if (stored) {
    cachedAuthUser = stored;
    return stored;
  }

  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) {
      clearStoredAuthUser();
      return null;
    }
    const data = (await response.json()) as { user?: AuthUser };
    if (data.user) {
      storeAuthUser(data.user);
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  clearStoredAuthUser();
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
}

