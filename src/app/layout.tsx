import type { Metadata, Viewport } from "next";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Bakso Terbang",
  description: "Aplikasi kasir dan dashboard Bakso Terbang",
  appleWebApp: { capable: true, title: "POS Bakso", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#d93408",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
