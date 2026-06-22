import type { Metadata } from "next";
import { Inter, Newsreader, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Larkup Blog Studio",
    template: "%s · Blog",
  },
  description: "Blog CMS System Builyt by Larkup Team",
};

export const viewport = {
  themeColor: "#FAF7F5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={` ${inter.variable} ${newsreader.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-right" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
