import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Site Bakım Modunda mı? (Evet, hala true)
  const isMaintenanceMode = true;

  // Yönetici Şifresi
  const GIZLI_ANAHTAR = "kitaplab_x99_erisim"; 
  
  // 1. İZİNLİ GİRİŞ NOKTALARI
  const isAllowedPath = 
    pathname.startsWith('/_next') || 
    pathname.includes('/api/') ||
    pathname.includes('.') || 
    pathname === '/yakinda' ||
    pathname === '/giris'; // Giriş sayfası herkese açık olmak zorunda

  if (isAllowedPath) return NextResponse.next();

  // 2. KİMLİK KONTROLLERİ (DAMGALAR)
  
  // A) Yönetici misin? (URL'den veya Cookie'den)
  const hasAdminQuery = request.nextUrl.searchParams.get('access') === GIZLI_ANAHTAR;
  const hasAdminCookie = request.cookies.get('admin_access')?.value === GIZLI_ANAHTAR;

  // B) Davetiye ile girmiş normal üye misin? (YENİ EKLENEN KISIM)
  const hasUserCookie = request.cookies.get('site_erisim')?.value === 'acik';

  // 3. EĞER YÖNETİCİ VEYA ÜYE İSE GEÇİŞ İZNİ VER
  if (hasAdminQuery || hasAdminCookie || hasUserCookie) {
    const response = NextResponse.next();
    
    // Yönetici linkiyle geldiyse admin cookie'si ver
    if (hasAdminQuery) {
      response.cookies.set('admin_access', GIZLI_ANAHTAR, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    }
    return response;
  }

  // 4. KİMSE DEĞİLSE -> YAKINDA SAYFASINA POSTALA
  if (isMaintenanceMode) {
    return NextResponse.rewrite(new URL('/yakinda', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};