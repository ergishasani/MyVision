"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { loginWithApple, loginWithGoogle } from "@/lib/api/auth";
import { signInWithApple } from "@/lib/auth/apple-sign-in";

type AuthSocialSectionProps = {
  label?: string;
  companyName?: string;
  onError?: (message: string) => void;
};

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "";

export function AuthSocialSection({
  label = "Or Login With",
  companyName,
  onError,
}: AuthSocialSectionProps) {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

  const googleEnabled = Boolean(GOOGLE_CLIENT_ID);
  const appleEnabled = Boolean(APPLE_CLIENT_ID);

  function reportError(message: string) {
    onError?.(message);
  }

  async function completeSocialSignIn(provider: "google" | "apple", action: () => Promise<void>) {
    setLoadingProvider(provider);
    try {
      await action();
      router.push("/dashboard");
    } catch (error) {
      reportError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : `Unable to sign in with ${provider}`,
      );
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleAppleSignIn() {
    await completeSocialSignIn("apple", async () => {
      const result = await signInWithApple();
      await loginWithApple({
        identityToken: result.identityToken,
        fullName: result.fullName,
        companyName,
      });
    });
  }

  return (
    <>
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-3 text-muted">{label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="relative h-11">
          <div className="pointer-events-none absolute inset-0 z-10 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-medium text-foreground">
            <GoogleIcon />
            {loadingProvider === "google" ? "..." : "Google"}
          </div>
          {googleEnabled ? (
            <div className="absolute inset-0 z-20 opacity-[0.01]">
              <GoogleLogin
                onSuccess={async (response) => {
                  if (!response.credential) {
                    reportError("Google sign-in did not return a token");
                    return;
                  }

                  await completeSocialSignIn("google", async () => {
                    await loginWithGoogle(response.credential!, companyName);
                  });
                }}
                onError={() => reportError("Google sign-in was cancelled or failed")}
                useOneTap={false}
                theme="outline"
                size="large"
                shape="rectangular"
                text="signin_with"
                width="100%"
              />
            </div>
          ) : (
            <button
              type="button"
              className="h-11 w-full rounded-lg border border-border bg-white opacity-60"
              disabled
            />
          )}
        </div>

        <SocialButton
          label="Apple"
          disabled={!appleEnabled || loadingProvider !== null}
          loading={loadingProvider === "apple"}
          onClick={() => {
            if (!appleEnabled) {
              reportError("Apple sign-in is not configured");
              return;
            }
            void handleAppleSignIn();
          }}
        >
          <AppleIcon />
        </SocialButton>
      </div>

      {!googleEnabled || !appleEnabled ? (
        <p className="mt-3 text-center text-xs text-muted">
          Configure{" "}
          {!googleEnabled ? (
            <code className="text-slate-500">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>
          ) : null}
          {!googleEnabled && !appleEnabled ? " and " : null}
          {!appleEnabled ? (
            <code className="text-slate-500">NEXT_PUBLIC_APPLE_CLIENT_ID</code>
          ) : null}{" "}
          in <code className="text-slate-500">.env.local</code> to enable social sign-in.
        </p>
      ) : null}
    </>
  );
}

function SocialButton({
  label,
  children,
  disabled = false,
  loading = false,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-medium text-foreground transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
      {loading ? "..." : label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}
