import { AuthOAuthProvider } from "@/components/auth/auth-oauth-provider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthOAuthProvider>{children}</AuthOAuthProvider>;
}
