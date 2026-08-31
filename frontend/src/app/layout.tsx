import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { LocaleProvider } from "@/components/providers/locale-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyVision",
  description: "Invoicing and project billing for construction and service businesses",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The shell is exactly `h-dvh` and paints its own chrome to the edges, so it should own the
  // whole screen rather than sit letterboxed inside the safe area with the browser filling the
  // rest. Everything pinned to an edge pads itself back out with env(safe-area-inset-*), so no
  // content ends up under the notch or the home indicator.
  viewportFit: "cover",
  // Matches --background, so Safari tints its own chrome to the page instead of guessing at it.
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `lang` is the server's best guess; LocaleProvider corrects it once the stored preference
    // is known. Rendering it here rather than leaving it off keeps the markup valid either way.
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full" suppressHydrationWarning>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
