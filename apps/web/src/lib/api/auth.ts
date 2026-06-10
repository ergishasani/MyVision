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

export async function checkHealth() {
  return apiFetch<{ status: string; service: string }>("/health", {
    auth: false,
  });
}
