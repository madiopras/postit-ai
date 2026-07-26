import type { Metadata } from "next";
import { Inter, Lexend, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

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
    // suppressHydrationWarning: next-themes stamps the `dark` class onto <html>
    // before React hydrates, so server and client markup differ here by design.
    <html
      lang="id"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", inter.variable, lexend.variable, "font-sans", geist.variable)}
    >
      {/* The Material Symbols webfont that used to be linked here is gone: every
          icon is now a tree-shaken lucide-react component, so the app no longer
          blocks on a CDN stylesheet or flashes unstyled ligature text. */}
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}