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
  /*
   * The colour Safari tints its own status bar and toolbar with — the two bands the page cannot
   * paint itself.
   *
   * White rather than --background: the band at the top sits directly against the mobile top bar,
   * which is --sidebar (#fff), so matching the page background instead left a visible seam between
   * the two. The content behind the bottom band is --background, near enough to white that one
   * value serves both ends.
   *
   * Declared for both schemes on purpose. Given a single light-only theme colour, Safari on a
   * phone set to Dark Mode discards it and falls back to its default grey chrome, which is the
   * band this is meant to remove. Repeating the same colour opts out of that.
   */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
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
