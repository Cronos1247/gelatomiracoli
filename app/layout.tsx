import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./miracoli-theme.css";
import { LanguageProvider } from "@/src/miracoli/i18n/LanguageProvider";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gelato Miracoli",
  description: "Luxury gelato recipe balancing and recipe book studio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} h-full antialiased`}>
      <body className="miracoli-theme min-h-full flex flex-col">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
