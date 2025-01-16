import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Navigation } from "@/components/navigation";
import { SignInButton } from "@/components/SignInButton"; // Import the SignInButton
import { SessionProvider } from "next-auth/react"; // Import SessionProvider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ElizaOS Leaderboard",
  description: "Stats for GitHub contributors to Eliza",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Wrap the entire layout with SessionProvider */}
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-screen bg-background">
              {/* Header section */}
              <header className="container mx-auto p-4 flex justify-between items-center">
                <Navigation />
                <div className="flex items-center gap-4">
                  <SignInButton /> {/* Add the SignInButton here */}
                  <ThemeToggle />
                </div>
              </header>
              {children}
            </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}