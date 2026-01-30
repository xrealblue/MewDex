import type { Metadata } from "next";
import "./globals.css";
import "./fonts.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";


export const metadata: Metadata = {
  title: "MewSwap Dex",
  description: "Mewswap dex with my own token mew and cat, and you can swap them with each other.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased bg-yellow-50`}
      >
        <Providers>
          <div className="flex flex-col bg-yellow-50 w-full min-h-screen">
            <Navbar />
            <main className="grow bg-yellow-50">
              {children}
           </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
