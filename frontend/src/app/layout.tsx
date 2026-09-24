import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GearHead AI — Virtual Car Mechanic & Troubleshooting Agent",
  description: "Chat with an ASE-Certified virtual master mechanic for instant vehicle troubleshooting, acoustic engine analysis, visual leak inspection, diagnostic fault codes, and certified mechanic bookings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-orange-500 selection:text-slate-950`}>
        {children}
      </body>
    </html>
  );
}
