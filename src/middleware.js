import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isMaintenanceMode = true;

  // ŞİFREYİ BURADAN DEĞİŞTİR (Dokunulmadı)
  const GIZLI_ANAHTAR = "kitaplab_x99_erisim"; 
  
  const hasAccessQuery = request.nextUrl.searchParams.get('access') === GIZLI_ANAHTAR;
  const hasAccessCookie = request.cookies.get('admin_access')?.value === GIZLI_ANAHTAR;

  // Eğer şifreli linkle girmişse veya çerezi varsa geçiş ver (Dokunulmadı)
  if (hasAccessQuery || hasAccessCookie) {
    const response = NextResponse.next();
    
    if (hasAccessQuery) {
      response.cookies.set('admin_access', GIZLI_ANAHTAR, { 
        path: '/', 
        maxAge: 60 * 60 * 24 * 7 // 7 gün açık kalır
      });
    }
    return response;
  }

  if (isMaintenanceMode) {
    const isAsset = 
      pathname.startsWith('/_next') || 
      pathname.includes('/api/') ||
      pathname.includes('.') || 
      pathname === '/yakinda' ||
      pathname === '/icon.png'; // İkonu burada da sağlama aldık

    if (isAsset) return NextResponse.next();

    return NextResponse.rewrite(new URL('/yakinda', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Buraya icon.png dosyasını da ekledik ki middleware bu dosyayı hiç durdurmasın
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)'],
};