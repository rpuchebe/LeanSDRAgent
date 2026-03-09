import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SDR Prospecting App",
  description: "Identify and verify high-value logistics targets.",
};

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 overflow-hidden flex flex-col h-screen">
            {children}
          </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
