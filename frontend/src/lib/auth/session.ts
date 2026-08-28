import type { AuthResponse, Company, User } from "@/types/api";

const TOKEN_KEY = "myvision_token";
const REFRESH_TOKEN_KEY = "myvision_refresh_token";
const USER_KEY = "myvision_user";
const COMPANY_KEY = "myvision_company";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getSession(): {
  token: string;
  refreshToken: string;
  user: User;
  company: Company;
} | null {
  const token = getToken();
  const refreshToken =
    typeof window === "undefined" ? null : localStorage.getItem(REFRESH_TOKEN_KEY);
  const user = readJson<User>(USER_KEY);
  const company = readJson<Company>(COMPANY_KEY);

  if (!token || !refreshToken || !user || !company) {
    return null;
  }

  return { token, refreshToken, user, company };
}

export function setSession(session: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  localStorage.setItem(COMPANY_KEY, JSON.stringify(session.company));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(COMPANY_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
