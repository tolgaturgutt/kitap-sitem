'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';

export default function PanoDuzenle({ params }) {
  const { id } = use(params); // Pano ID'si
  const router = useRouter();
  
  // --- STATE'LER (PanoEkle ile aynı) ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  
  const [books, setBooks] = useState([]); // Arama için kitap listesi
  const [chapters, setChapters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);

  // --- 1. VERİLERİ ÇEKME VE BAŞLANGIÇ AYARLARI ---
  useEffect(() => {
    async function init() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) { router.push('/giris'); return; }
      setUser(activeUser);

      // A) PANOYU ÇEK
      const { data: pano, error } = await supabase
        .from('panolar')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !pano) {
        toast.error('Pano bulunamadı!');
        router.push('/profil');
        return;
      }

      // B) YETKİ KONTROLÜ (Admin listesini çek ve kontrol et)
      const { data: adminList } = await supabase.from('announcement_admins').select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      setAdminEmails(emails);

      const isAdmin = emails.includes(activeUser.email);
      const isOwner = pano.user_email === activeUser.email;

      if (!isOwner && !isAdmin) {
        toast.error('Bu panoyu düzenleme yetkin yok!');
        router.push('/');
        return;
      }

      // C) FORMU DOLDUR
      setTitle(pano.title);
      setContent(pano.content);

      // D) KİTAPLARI GETİR (PanoEkle'deki Hayalet Filtresiyle Aynı)
      let { data: allBooks } = await supabase
        .from('books')
        .select('id, title, cover_url, user_email, username, chapters(id)') 
        .eq('is_draft', false) 
        .order('title');
      
      // Hayalet Filtresi: Bölümü olmayanları at
      if (allBooks) {
        allBooks = allBooks.filter(book => book.chapters && book.chapters.length > 0);
        
        // Profil resimlerini ekle
        const booksWithProfiles = await Promise.all(
          allBooks.map(async (book) => {
            const { data: authorProfile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('email', book.user_email)
              .single();
            return {
              ...book,
              avatar_url: authorProfile?.avatar_url || null,
              is_admin: emails.includes(book.user_email)
            };
          })
        );
        setBooks(booksWithProfiles);

        // E) MEVCUT KİTABI SEÇİLİ YAP
        const currentBook = booksWithProfiles.find(b => b.id === pano.book_id);
        if (currentBook) {
          setSelectedBook(currentBook);
          setSearchQuery(currentBook.title);
          
          // F) BÖLÜMLERİ GETİR VE SEÇİLİ BÖLÜMÜ AYARLA
          const { data: chapData } = await supabase
            .from('chapters')
            .select('id, title, order_no') 
            .eq('book_id', currentBook.id)
            .order('order_no', { ascending: true });
            
          setChapters(chapData || []);

          if (pano.chapter_id) {
            const currentChapter = chapData?.find(c => c.id === pano.chapter_id);
            setSelectedChapter(currentChapter || null);
          }
        }
      }
      setLoading(false);
    }
    init();
  }, [id, router]);

  // --- 2. KİTAP DEĞİŞİNCE BÖLÜMLERİ GÜNCELLE ---
  // (Kullanıcı düzenlerken başka kitap seçerse burası çalışır)
  useEffect(() => {
    async function getChapters() {
      if (!selectedBook) {
        setChapters([]);
        setSelectedChapter(null);
        return;
      }

      // ✅ LOGSUZ VE DOĞRU SÜTUN (order_no)
      const { data } = await supabase
        .from('chapters')
        .select('id, title, order_no') 
        .eq('book_id', selectedBook.id)
        .order('order_no', { ascending: true });
      
      setChapters(data || []);
    }
    // Sadece selectedBook değiştiğinde çalışsın (İlk yüklemede init hallediyor)
    if (selectedBook) getChapters();
  }, [selectedBook]);

  // Arama filtresi
  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 3. GÜNCELLEME İŞLEMİ (Update) ---
  async function handleUpdate(e) {
    e.preventDefault();

    if (!title.trim()) { toast.error('Başlık gerekli!'); return; }
    if (!content.trim()) { toast.error('İçerik gerekli!'); return; }
    if (!selectedBook) { toast.error('Bir kitap seçmelisin!'); return; }

    setSaving(true);
    const toastId = toast.loading('Pano güncelleniyor...');

    const { error } = await supabase
      .from('panolar')
      .update({
        title: title.trim(),
        content: content.trim(),
        book_id: selectedBook.id,
        chapter_id: selectedChapter?.id || null, // Bölüm seçildiyse ID'si, yoksa null
        updated_at: new Date()
      })
      .eq('id', id);

    if (error) {
      toast.error('Hata: ' + error.message, { id: toastId });
      setSaving(false);
    } else {
      toast.success('Pano başarıyla güncellendi! ✅', { id: toastId });
      router.push('/profil'); // Profile geri dön
    }
  }

  if (loading) return (
    <div className="py-40 flex justify-center items-center animate-pulse">
      <div className="text-5xl font-black tracking-tighter">
        <span className="text-black dark:text-white">Kitap</span>
        <span className="text-red-600">Lab</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black">
      <Toaster />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter dark:text-white mb-2">
            ✏️ Panoyu Düzenle
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Mevcut panon üzerinde değişiklikler yapabilirsin.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="bg-white dark:bg-white/5 rounded-[3rem] border dark:border-white/10 p-8 md:p-12 space-y-6">
          
          {/* BAŞLIK */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-3">
              Başlık *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Panonun başlığı..."
              className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl text-base outline-none focus:border-blue-600 transition-colors"
              maxLength={150}
            />
            <p className="text-xs text-gray-400 mt-2">{title.length}/150</p>
          </div>

          {/* İÇERİK */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-3">
              İçerik *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Düşüncelerini buraya yaz..."
              className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl text-base outline-none focus:border-blue-600 transition-colors min-h-[200px] resize-none"
            />
            <p className="text-xs text-gray-400 mt-2">{content.length} karakter</p>
          </div>

          {/* KİTAP SEÇİMİ (Aynı Tasarım) */}
          <div className="relative">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-3">
              Kitap Seç * {selectedBook && '✓'}
            </label>
            
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowBookDropdown(true)}
                placeholder="Kitap ara (değiştirmek istersen)..."
                className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl text-base outline-none focus:border-blue-600 transition-colors"
              />
              
              {showBookDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border dark:border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-50">
                  {filteredBooks.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">Kitap bulunamadı</div>
                  ) : (
                    filteredBooks.map(book => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => {
                          setSelectedBook(book);
                          setSearchQuery(book.title);
                          setShowBookDropdown(false);
                          setSelectedChapter(null); // Kitap değişince bölümü sıfırla
                        }}
                        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left border-b dark:border-white/5 last:border-0"
                      >
                         {/* Profil Resmi */}
                         <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 flex items-center justify-center font-black text-sm shrink-0">
                          {book.avatar_url ? (
                            <img src={book.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            book.user_email[0].toUpperCase()
                          )}
                        </div>
                        {/* Kapak */}
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10 shrink-0">
                          {book.cover_url && <img src={book.cover_url} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate dark:text-white">{book.title}</p>
                          <div className="text-xs mt-1">
                            <Username username={book.username} isAdmin={book.is_admin} />
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* SEÇİLEN KİTAP KARTI */}
            {selectedBook && (
              <div className="mt-4 flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <div className="w-16 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10 shrink-0">
                  {selectedBook.cover_url && <img src={selectedBook.cover_url} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-bold dark:text-white">{selectedBook.title}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    <Username username={selectedBook.username} isAdmin={selectedBook.is_admin} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Seçildi ✓</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBook(null);
                    setSearchQuery('');
                    setSelectedChapter(null);
                  }}
                  className="text-red-600 hover:text-red-700 font-black text-sm"
                >
                  Değiştir
                </button>
              </div>
            )}
          </div>

          {/* BÖLÜM SEÇİMİ (Order No Düzeltilmiş) */}
          {selectedBook && chapters.length > 0 && (
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-3">
                Bölüm Seç (Opsiyonel)
              </label>
              <select
                value={selectedChapter?.id || ''}
                onChange={(e) => {
                  const chapterId = parseInt(e.target.value);
                  const chapter = chapters.find(c => c.id === chapterId);
                  setSelectedChapter(chapter || null);
                }}
                className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl text-base outline-none focus:border-blue-600 transition-colors"
              >
                <option value="">Bölüm seçme (tüm kitap için)</option>
                {chapters.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    Bölüm {ch.order_no}: {ch.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* BUTONLAR */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              disabled={saving}
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-sm shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              disabled={saving || !title.trim() || !content.trim() || !selectedBook}
            >
              {saving ? 'Güncelleniyor...' : '💾 Panoyu Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}