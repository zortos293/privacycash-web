import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "AnonBNB - Private BNB Transfers",
  description: "Transfer BNB privately using zero-knowledge proofs on BNB Chain",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
        <Toaster />
      </body>
    </html>
  );
}
