export const REMEMBER_EMAIL_KEY = "myvision.remembered-email";

export function getRememberedEmail() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(REMEMBER_EMAIL_KEY);
}

export function persistRememberedEmail(email: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    return;
  }

  localStorage.removeItem(REMEMBER_EMAIL_KEY);
}
