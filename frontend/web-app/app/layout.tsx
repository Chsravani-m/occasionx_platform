import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AppShell from "@/components/layout/AppShell";
import { NotificationProvider } from "@/context/NotificationContext";
import { ScreenShareProvider } from "@/context/ScreenShareContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OccasionX",
  description: "Plan less..celebrate more..",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <NotificationProvider>
          <ScreenShareProvider>
            <AppShell>
              {children}
            </AppShell>
          </ScreenShareProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}