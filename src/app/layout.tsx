import type { Metadata } from "next";

import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPS VMR Publisher",
  description: "Internal CPS Virtual Morning Report publishing workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-surface-primary text-text-primary antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
