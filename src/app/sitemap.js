import { createClient } from '@supabase/supabase-js';

export default async function sitemap() {
  const baseUrl = 'https://kitaplab.com';

  // Supabase Bağlantısı (Senin .env.local dosyasındaki şifreleri kullanır)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // 1. STATİK VİTRİN SAYFALARI (Klasörlerinden çıkardığım güvenli liste)
  const staticPaths = [
    '',
    '/arama',
    '/en-cok-okunanlar',
    '/iletisim',
    '/kutuphane',
    '/kurallar',
    '/kvkk',
    '/panolar',
    '/siralama',
    '/yakinda'
  ];

  const staticRoutes = staticPaths.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'always' : 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. DİNAMİK SAYFALAR (Veritabanından Çekilenler)
  
  // A) Kitaplar (/kitap/[id])
  // Not: 'kitaplar' tablo ismini kendi veritabanındaki isme göre ayarla (örn: 'books' olabilir)
  const { data: kitaplar } = await supabase
    .from('books')
    .select('id, created_at, chapters!inner(id)')
    .eq('is_draft', false)
    .eq('chapters.is_draft', false)
    .order('created_at', { ascending: false })
    .limit(1000); // Google için ilk 1000 kitabı çekiyoruz, artırılabilir.

  const kitapRoutes = (kitaplar || []).map((kitap) => ({
    url: `${baseUrl}/kitap/${kitap.id}`,
    lastModified: new Date(kitap.created_at),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // B) Kategoriler (/kategori/[slug])
  const { data: kategoriler } = await supabase.from('kategoriler').select('slug');
  const kategoriRoutes = (kategoriler || []).map((kategori) => ({
    url: `${baseUrl}/kategori/${kategori.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // C) Yazarlar (/yazar/[username])
  const { data: yazarlar } = await supabase.from('kullanicilar').select('username');
  const yazarRoutes = (yazarlar || []).map((yazar) => ({
    url: `${baseUrl}/yazar/${yazar.username}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // D) Panolar (/pano/[id])
  const { data: panolar } = await supabase
    .from('panolar')
    .select('id, book_id, chapter_id, books(is_draft), chapters(is_draft)');
  const publicPanolar = (panolar || []).filter(pano =>
    (!pano.book_id || (pano.books && !pano.books.is_draft)) &&
    (!pano.chapter_id || (pano.chapters && !pano.chapters.is_draft))
  );
  const panoRoutes = publicPanolar.map((pano) => ({
    url: `${baseUrl}/pano/${pano.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  // E) Etkinlikler (/etkinlikler/[id])
  const { data: etkinlikler } = await supabase.from('etkinlikler').select('id');
  const etkinlikRoutes = (etkinlikler || []).map((etkinlik) => ({
    url: `${baseUrl}/etkinlikler/${etkinlik.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

 
  return [
    ...staticRoutes,
    ...kitapRoutes,
    ...kategoriRoutes,
    ...yazarRoutes,
    ...panoRoutes,
    ...etkinlikRoutes
  ];
}
