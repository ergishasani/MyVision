const APPLE_SCRIPT_ID = "apple-sign-in-sdk";
const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

type AppleSignInResult = {
  identityToken: string;
  fullName?: string;
};

type AppleAuthorization = {
  id_token: string;
};

type AppleUser = {
  name?: {
    firstName?: string;
    lastName?: string;
  };
};

type AppleSignInResponse = {
  authorization: AppleAuthorization;
  user?: AppleUser;
};

type AppleAuthApi = {
  init: (config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    usePopup: boolean;
  }) => void;
  signIn: () => Promise<AppleSignInResponse>;
};

declare global {
  interface Window {
    AppleID?: {
      auth: AppleAuthApi;
    };
  }
}

let appleScriptPromise: Promise<void> | null = null;

function loadAppleScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Apple Sign In is only available in the browser"));
  }

  if (window.AppleID?.auth) {
    return Promise.resolve();
  }

  if (!appleScriptPromise) {
    appleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(APPLE_SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Apple Sign In")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.id = APPLE_SCRIPT_ID;
      script.src = APPLE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Apple Sign In"));
      document.head.appendChild(script);
    });
  }

  return appleScriptPromise;
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Apple sign-in is not configured");
  }

  await loadAppleScript();

  if (!window.AppleID?.auth) {
    throw new Error("Apple Sign In is unavailable");
  }

  window.AppleID.auth.init({
    clientId,
    scope: "name email",
    redirectURI: window.location.origin,
    usePopup: true,
  });

  const response = await window.AppleID.auth.signIn();
  const identityToken = response.authorization?.id_token;
  if (!identityToken) {
    throw new Error("Apple sign-in did not return a token");
  }

  const firstName = response.user?.name?.firstName ?? "";
  const lastName = response.user?.name?.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    identityToken,
    fullName: fullName || undefined,
  };
}
