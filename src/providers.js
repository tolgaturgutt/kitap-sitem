'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }) {
  // attribute="class" -> CSS sınıfına göre değişim yap
  // defaultTheme="dark" -> Site ilk açıldığında SİYAH açılsın
  // enableSystem={false} -> Bilgisayar ayarını boşver, bizim ayarı dinle
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}