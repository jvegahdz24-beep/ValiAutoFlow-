import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ValiAutoFlow — Deja de perder leads. Empieza a vender 24/7.",
  description:
    "No es un chatbot. Es una IA que atiende, califica, publica, reactiva y cobra — todo en uno. El primer Sistema Operativo Comercial Cognitivo de LATAM. 7 motores cognitivos que convierten clics en clientes.",
  keywords: [
    "ValiAutoFlow",
    "IA ventas",
    "automatización comercial",
    "WhatsApp AI",
    "chatbot ventas",
    "lead scoring",
    "seguimiento automático",
    "marketing automation LATAM",
    "JHON agente IA",
    "MARK marketing IA",
    "Cognitive OS",
    "Carnales",
  ],
  authors: [{ name: "ValiAutoFlow" }],
  openGraph: {
    title: "ValiAutoFlow — Deja de perder leads. Empieza a vender 24/7.",
    description:
      "No es un chatbot. Es una IA que atiende, califica, publica, reactiva y cobra — todo en uno. El primer Sistema Operativo Comercial Cognitivo de LATAM.",
    type: "website",
    locale: "es_MX",
    siteName: "ValiAutoFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "ValiAutoFlow — Deja de perder leads. Empieza a vender 24/7.",
    description:
      "7 motores cognitivos que convierten clics en clientes. IA que atiende, califica y cierra por ti.",
  },
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
