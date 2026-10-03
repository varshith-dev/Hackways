import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { GlobalAnalyticsTracker } from "@/components/analytics/GlobalAnalyticsTracker";
import SmoothScroll from "@/components/providers/SmoothScroll";

const sansFont = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const monoFont = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hackways — Events & Instant RSVPs",
  description: "Clean, high-performance event ticketing and instant RSVPs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sansFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      {/* font-sans resolves to --font-sans, i.e. Plus Jakarta Sans, for the whole
          platform; bg/text come off the Hackways ramp rather than Tailwind zinc. */}
      <body className="min-h-full flex flex-col bg-whiteout font-sans text-caviar">
        <SmoothScroll />
        <AuthProvider>
          <Suspense fallback={null}>
            <GlobalAnalyticsTracker />
          </Suspense>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
