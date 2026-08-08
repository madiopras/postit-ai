import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PostIt AI",
  description: "Smart Answers, Instant Actions — chatbot SOP & FAQ perusahaan",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PostIt AI",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline script below stamps the `dark` class
    // onto <html> before React hydrates, so this element differs by design.
    <html
      lang="id"
      suppressHydrationWarning
      className={cn("h-full antialiased font-sans", plusJakartaSans.variable)}
    >
      <head>
        {/* Server-rendered so it runs before first paint — no flash of the wrong
            theme. A <script> here is fine; one rendered from a client component
            is not, which is what React 19 was warning about. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-base-100 text-base-content selection:bg-primary/20 selection:text-primary">
        {children}
        <ServiceWorkerRegister />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

