import { clearSession, getRefreshToken, getToken, setSession } from "@/lib/auth/session";
import type { ApiErrorBody, AuthResponse } from "@/types/api";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8080/api";

export class ApiError extends Error {
  code: string;
  fields?: Record<string, string>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.fields = body.fields;
  }
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

/**
 * A refresh already in flight, shared by everything that hit a 401 at the same moment.
 *
 * <p>Refresh tokens are single-use and rotate server-side, so two parallel refreshes would spend
 * the same token twice and whichever lost the race would sign the operator out. The overview
 * screen alone fires two requests together, so simultaneous 401s are the normal case here, not a
 * rare one.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function requestFreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      return false;
    }
    setSession((await response.json()) as AuthResponse);
    return true;
  } catch {
    // Offline, or the API is down. Indistinguishable from here, and neither is a reason to
    // throw the session away — the next attempt can try again.
    return false;
  }
}

function refreshOnce() {
  refreshInFlight ??= requestFreshToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { auth = true, headers: initHeaders, ...rest } = options;

  const send = () => {
    const headers = new Headers(initHeaders);

    // FormData is the exception: the browser has to set the header itself so it can include the
    // multipart boundary. Stamping application/json here would strip that and the upload would
    // arrive unparseable.
    const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;
    if (!headers.has("Content-Type") && rest.body && !isFormData) {
      headers.set("Content-Type", "application/json");
    }

    if (auth) {
      // Read on every attempt, so a retry picks up the token the refresh just stored.
      const token = getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    return fetch(`${baseUrl}${path}`, { ...rest, headers });
  };

  let response = await send();

  // A 401 on an authenticated call almost always means the access token aged out — it lasts a
  // day, while the refresh token behind it lasts a month. Spending one to mint a new access
  // token is far better than making someone sign in again mid-task.
  if (response.status === 401 && auth) {
    if (await refreshOnce()) {
      response = await send();
    }

    if (response.status === 401) {
      // The refresh token is gone or spent too, so this session is genuinely over. Dropping it
      // lets the app shell send them to sign in, rather than leaving a shell that shows their
      // name above a page that can never load.
      clearSession();
    }
  }

  if (!response.ok) {
    let body: ApiErrorBody = {
      message: response.statusText || "Request failed",
      code: "REQUEST_FAILED",
    };

    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // ignore parse errors
    }

    throw new ApiError(body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl() {
  return baseUrl;
}
