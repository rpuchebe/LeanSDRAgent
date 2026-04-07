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

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
          <main className="flex-1 overflow-hidden flex flex-col h-screen relative">
            <SidebarTrigger className="absolute top-4 left-3 z-40 size-8 rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all" />
            {children}
          </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
