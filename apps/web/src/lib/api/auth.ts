import { apiFetch } from "@/lib/api/client";
import { setSession } from "@/lib/auth/session";
import type { AuthResponse } from "@/types/api";

export async function login(email: string, password: string) {
  const response = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });

  setSession(response);
  return response;
}

export async function register(input: {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
}) {
  const response = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  });

  setSession(response);
  return response;
}

export async function getCurrentUser() {
  return apiFetch<AuthResponse>("/auth/me");
}

export async function loginWithGoogle(idToken: string, companyName?: string) {
  const response = await apiFetch<AuthResponse>("/auth/google", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ idToken, companyName }),
  });

  setSession(response);
  return response;
}

export async function loginWithApple(input: {
  identityToken: string;
  fullName?: string;
  companyName?: string;
}) {
  const response = await apiFetch<AuthResponse>("/auth/apple", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  });

  setSession(response);
  return response;
}

export async function forgotPassword(email: string) {
  return apiFetch<{ message: string; token?: string | null }>("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ token, password }),
  });
}

export async function checkHealth() {
  return apiFetch<{ status: string; service: string }>("/health", {
    auth: false,
  });
}
