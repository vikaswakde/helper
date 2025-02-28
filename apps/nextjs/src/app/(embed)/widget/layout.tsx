import "@/app/globals.css";
import { Analytics } from "@vercel/analytics/react";
import cx from "classnames";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { sundryBold, sundryMedium, sundryNarrowBold, sundryNarrowMedium, sundryRegular } from "@/components/fonts";

export const metadata: Metadata = {
  title: "Helper",
  description: "AI powered assistant",
  icons: [
    {
      rel: "icon",
      type: "image/x-icon",
      url: "/favicon.ico",
      media: "(prefers-color-scheme: light)",
    },
    {
      rel: "icon",
      type: "image/x-icon",
      url: "/favicon_dark.ico",
      media: "(prefers-color-scheme: dark)",
    },
  ],
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cx(
        "h-full",
        sundryRegular.variable,
        sundryMedium.variable,
        sundryBold.variable,
        sundryNarrowMedium.variable,
        sundryNarrowBold.variable,
      )}
    >
      <body className="h-full overflow-y-hidden antialiased text-foreground bg-background font-regular">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Analytics />
      </body>
    </html>
  );
}
