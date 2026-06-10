import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyVision",
  description: "Invoicing and project billing for construction and service businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
