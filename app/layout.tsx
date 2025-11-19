// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://your-domain.com"),
  title: {
    default: "Diplomasi LTD",
    template: "%s | Parts Management System - Diplomasi LTD",
  },
  description:
    "Professional parts management system for inventory tracking, customer management, and sales reporting. Streamline your business operations with our comprehensive solutions.",
  keywords: [
    "parts management",
    "inventory tracking",
    "stock management",
    "customer management",
    "sales reporting",
    "business management",
    "warehouse management",
    "inventory system",
    "automotive parts",
    "equipment management",
  ],
  authors: [{ name: "Diplomasi LTD" }],
  creator: "Diplomasi LTD",
  publisher: "Diplomasi LTD",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  applicationName: "Parts Management System",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://your-domain.com",
    title: "Parts Management System - Diplomasi LTD",
    description:
      "Professional parts management system for inventory tracking, customer management, and sales reporting. Streamline your business operations with our comprehensive solutions.",
    siteName: "Parts Management System",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Parts Management System Logo - Diplomasi LTD",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parts Management System - Diplomasi LTD",
    description:
      "Professional parts management system for inventory tracking, customer management, and sales reporting. Streamline your business operations with our comprehensive solutions.",
    images: ["/logo.png"],
    creator: "@DiplomasiLTD",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  category: "business",
  classification: "Inventory Management, Parts Tracking, Business Management",
  verification: {
    google: "google-site-verification-code", // Replace with actual code
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "msapplication-TileColor": "#000000",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://your-domain.com" />
        <meta name="geo.region" content="US" />
        <meta name="geo.placename" content="United States" />
        <meta name="geo.position" content="39.7392;-104.9903" />
        <meta name="ICBM" content="39.7392, -104.9903" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
