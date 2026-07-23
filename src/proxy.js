import { NextResponse } from 'next/server';

const MAINTENANCE_PATH = '/bakim';

export default function proxy(request) {
  const { pathname } = request.nextUrl;
  const maintenanceMode = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  const isMaintenanceMode = maintenanceMode !== 'false';

  if (!isMaintenanceMode) {
    return NextResponse.next();
  }

  const isTechnicalAsset =
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png' ||
    pathname.includes('.');

  if (pathname === MAINTENANCE_PATH || isTechnicalAsset) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        error: 'KitapLab kısa süreliğine bakımda.',
        maintenance: true,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '900',
        },
      }
    );
  }

  const maintenanceUrl = request.nextUrl.clone();
  maintenanceUrl.pathname = MAINTENANCE_PATH;
  maintenanceUrl.search = '';

  return NextResponse.rewrite(maintenanceUrl, {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'Retry-After': '900',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
