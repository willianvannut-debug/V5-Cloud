//app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakartaSans = Inter({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "V5 Fibra Enterprise",
  description: "Painel de controle corporativo de rede e viabilidade",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "V5 Técnico",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${jakartaSans.variable} antialiased bg-[#0a0a0a] text-zinc-50`}>
        {/* O AuthProvider deve envolver toda a aplicação */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}