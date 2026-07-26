import type { Metadata } from "next";
import { Inter, Lexend, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PostIt AI",
  description: "Smart Answers, Instant Actions — chatbot SOP & FAQ perusahaan",
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
      className={cn("h-full", "antialiased", inter.variable, lexend.variable, "font-sans", geist.variable)}
    >
      <head>
        {/* Server-rendered so it runs before first paint — no flash of the wrong
            theme. A <script> here is fine; one rendered from a client component
            is not, which is what React 19 was warning about. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}