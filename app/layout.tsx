import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./miracoli-theme.css";
import { LanguageProvider } from "@/src/miracoli/i18n/LanguageProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
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
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="miracoli-theme min-h-full flex flex-col font-sans text-white">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
