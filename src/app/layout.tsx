import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Bakso Terbang",
  description: "Aplikasi kasir dan dashboard Bakso Terbang",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
