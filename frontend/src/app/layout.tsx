import type { Metadata } from "next";
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
