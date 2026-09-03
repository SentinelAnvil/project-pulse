import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Pulse",
  description: "See neglected work, active priorities, and completed progress in one place.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
