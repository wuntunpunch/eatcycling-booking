import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EAT Cycling - Book Your Bike Service",
  description: "Book your bike service with EAT Cycling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased min-h-screen bg-gray-50 relative`}>
        {/* Pink gradient overlay matching the main site */}
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,235,255,0.1) 40%, rgba(254,150,254,0.2) 80%, rgba(254,19,254,0.4) 100%)",
          }}
        ></div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
