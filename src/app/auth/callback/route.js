import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next'); // URL'deki ?next=/sifre-yenile kısmını yakalar

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
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