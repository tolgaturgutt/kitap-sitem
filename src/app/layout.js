'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hideNavbar = pathname === '/giris' || pathname === '/kayit';

  // DİKKAT: Artık burada 'return null' yapmıyoruz. 
  // İskelet (html ve body) her zaman render edilmeli.

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#fafafa] dark:bg-black text-black dark:text-white transition-colors duration-300`}>
        
        {/* Sadece içeriği ThemeProvider ile sarıyoruz */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          
          {/* Navbar ve İçerik sadece mounted olduktan sonra veya doğrudan render edilebilir */}
          {mounted ? (
            <>
              {!hideNavbar && <Navbar />}
              <main className={!hideNavbar ? "pt-20" : ""}>
                {children}
              </main>
            </>
          ) : (
            // Sayfa yüklenirken boşluk kalmaması için children'ı iskelet içinde tutuyoruz
            <main className={!hideNavbar ? "pt-20" : ""}>
              {children}
            </main>
          )}

        </ThemeProvider>

      </body>
    </html>
  );
}