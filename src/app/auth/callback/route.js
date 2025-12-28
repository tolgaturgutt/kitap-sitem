import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next'); // URL'deki ?next=/sifre-yenile kısmını yakalar

  if (code) {
    const cookieStore = await cookies();
    
    // ✅ YENİ SUPABASE SSR YAPISI
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    
    // 1. Mailden gelen kodu kullanarak kullanıcının oturumunu aç
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 2. Eğer linkte "şuraya git" (next) denmişse oraya fırlat
  if (next) {
    return NextResponse.redirect(`${requestUrl.origin}${next}`);
  }

  // 3. Denmemişse ana sayfaya fırlat
  return NextResponse.redirect(`${requestUrl.origin}/`);
}