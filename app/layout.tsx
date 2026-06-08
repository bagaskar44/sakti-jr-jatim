import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "SAKTI JR-JATIM",
  description: "Dashboard monitoring Jasa Raharja Jawa Timur",
  icons: {
    icon: [{ url: "/images/logo-jasa-raharja.png", type: "image/png" }],
    shortcut: [{ url: "/images/logo-jasa-raharja.png", type: "image/png" }],
    apple: [{ url: "/images/logo-jasa-raharja.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
