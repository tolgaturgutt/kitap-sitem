'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Username from '@/components/Username';
import imageCompression from 'browser-image-compression';

import BookCoverImage from '@/components/BookCoverImage';

export default function PanoEkle() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);
  const [panoImageUrl, setPanoImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowsMultiple, setPollAllowsMultiple] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) {
        router.push('/giris');
        return;
      }
      setUser(activeUser);

      // Kullanıcı adını al
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', activeUser.id)
        .single();
      
      const uname = profile?.username || activeUser.user_metadata?.username || activeUser.email.split('@')[0];
      setUsername(uname);

      // Admin listesini çek
      const { data: adminList } = await supabase
        .from('announcement_admins')
        .select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      setAdminEmails(emails);

    // ✅ KENDİ KİTAPLARI + ORTAK YAZAR OLDUĞU KİTAPLARI GETİR
      let { data: allBooks } = await supabase
        .from('books')
        .select('id, title, cover_url, user_email, username, chapters(id, is_draft)')
        .eq('is_draft', false)
        // 👇 DEĞİŞEN KISIM: Ya sahibi benim, ya da onaylanmış ortak yazarım
        .or(`user_id.eq.${activeUser.id},and(co_author_id.eq.${activeUser.id},co_author_status.eq.accepted)`)
        .order('title');
      
      // Hayalet Filtresi: Bölümü olmayanları at
      if (allBooks) {
        allBooks = allBooks.filter(book => book.chapters?.some(chapter => !chapter.is_draft));
        
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
      }
      
      setLoading(false);
    }
    init();
  }, [router]);

  // Kitap seçilince bölümleri getir
  useEffect(() => {
    async function getChapters() {
      if (!selectedBook) {
        setChapters([]);
        setSelectedChapter(null);
        return;
      }

      const { data } = await supabase
        .from('chapters')
        .select('id, title, order_no') 
        .eq('book_id', selectedBook.id)
        .eq('is_draft', false)
        .order('order_no', { ascending: true });
      
      setChapters(data || []);
    }
    getChapters();
  }, [selectedBook]);

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isAdmin = Boolean(user?.email && adminEmails.includes(user.email));

  function normalizePollOptions(values = []) {
    return values.map(value => value.trim()).filter(value => value.length > 0);
  }

  async function handlePanoImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!selectedBook && !isAdmin) {
      e.target.value = '';
      toast.error('Pano görseli eklemek için önce bir kitap seçmelisin!');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Sadece görsel yükleyebilirsin!');
      return;
    }

    setUploadingImage(true);
    const toastId = toast.loading('Görsel yükleniyor...');

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.35,
        maxWidthOrHeight: 1200,
        useWebWorker: false,
        fileType: 'image/jpeg',
        initialQuality: 0.75
      });

      const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const filePath = `panolar/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, compressedFile, {
          cacheControl: '31536000',
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        toast.error('Görsel yüklenemedi!', { id: toastId });
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      setPanoImageUrl(publicUrl);
      toast.remove(toastId);
    } catch (error) {
      console.error('Pano image upload error:', error);
      toast.error('Görsel işlenirken hata oluştu!', { id: toastId });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  function getPanoSaveErrorMessage(error) {
    const errorText = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();

    if (errorText.includes('pano_daily_limit_reached')) {
      return 'Bugünkü 5 pano hakkın doldu. Yarın tekrar pano oluşturabilirsin.';
    }
    if (errorText.includes('pano_requires_published_book')) {
      return 'Pano paylaşabilmek için yayınlanmış ve en az bir bölümü olan bir kitabın bulunmalı.';
    }
    if (errorText.includes('pano_book_required')) {
      return 'Pano paylaşmak için önce yayınlanmış kitabını seçmelisin.';
    }
    if (errorText.includes('pano_poll_')) {
      return error?.message || 'Anket bilgileri kaydedilemedi. Soruyu ve seçenekleri kontrol et.';
    }

    const schemaNeedsUpdate =
      error?.code === '42703' ||
      error?.code === 'PGRST204' ||
      error?.code === '23502' ||
      errorText.includes('image_url') ||
      errorText.includes('book_id') ||
      errorText.includes('null value') ||
      errorText.includes('create_pano_poll');

    if (schemaNeedsUpdate) {
      return 'Veritabanı güncellemesi eksik: add_pano_polls.sql çalışmalı.';
    }

    return error?.message ? `Hata: ${error.message}` : 'Hata oluştu!';
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Başlık gerekli!');
      return;
    }
    if (!content.trim()) {
      toast.error('İçerik gerekli!');
      return;
    }
    if (books.length === 0 && !isAdmin) {
      toast.error('Pano paylaşabilmek için yayınlanmış bir kitabın bulunmalı!');
      return;
    }
    if (!selectedBook && !isAdmin) {
      toast.error('Pano paylaşmak için bir kitap seçmelisin!');
      return;
    }
    if (!selectedBook && !panoImageUrl && !hasPoll) {
      toast.error('Kitapsız admin panosu için bir görsel veya anket eklemelisin!');
      return;
    }

    const cleanedPollOptions = normalizePollOptions(pollOptions);
    if (hasPoll && pollQuestion.trim().length < 3) {
      toast.error('Anket sorusu en az 3 karakter olmalı!');
      return;
    }
    if (hasPoll && cleanedPollOptions.length < 2) {
      toast.error('Ankete en az 2 dolu seçenek eklemelisin!');
      return;
    }
    if (hasPoll && new Set(cleanedPollOptions.map(option => option.toLocaleLowerCase('tr-TR'))).size !== cleanedPollOptions.length) {
      toast.error('Anket seçenekleri birbirinden farklı olmalı!');
      return;
    }

    if (hasPoll) {
      setPollOptions(cleanedPollOptions.length > 0 ? cleanedPollOptions : ['', '']);
    }

    setSaving(true);
    const toastId = toast.loading('Pano oluşturuluyor...');

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast.error('Oturumun sona ermiş. Lütfen tekrar giriş yap.', { id: toastId });
      setSaving(false);
      router.push('/giris');
      return;
    }

    const payload = {
      user_email: user.email,
      username: username,
      title: title.trim(),
      content: content.trim(),
      book_id: selectedBook?.id || null,
      chapter_id: selectedBook ? selectedChapter?.id || null : null
    };

    if (panoImageUrl) {
      payload.image_url = panoImageUrl;
    }

    const { error } = hasPoll
      ? await supabase.rpc('create_pano_poll', {
          p_title: payload.title,
          p_content: payload.content,
          p_username: payload.username,
          p_book_id: payload.book_id,
          p_chapter_id: payload.chapter_id,
          p_image_url: panoImageUrl || null,
          p_question: pollQuestion.trim(),
          p_allows_multiple: pollAllowsMultiple,
          p_options: cleanedPollOptions
        })
      : await supabase.from('panolar').insert(payload);

    if (error) {
      console.error('Pano insert error:', error);
      const rawMessage = error?.message || getPanoSaveErrorMessage(error);
      toast.error(rawMessage, { id: toastId });
      setSaving(false);
      return;
    }

    toast.remove(toastId);
    router.push('/');
  }

  if (loading) return (
    <div className="py-40 flex justify-center items-center animate-pulse">
      <div className="text-5xl font-black tracking-tighter">
        <span className="text-black dark:text-white">Kitap</span>
        <span className="text-red-600">Lab</span>
      </div>
    </div>
  );

  if (books.length === 0 && !isAdmin) {
    return (
      <div className="min-h-screen py-24 px-4 md:px-6 bg-[#fafafa] dark:bg-black">
        <div className="max-w-xl mx-auto bg-white dark:bg-white/5 border dark:border-white/10 rounded-[2.5rem] p-8 md:p-12 text-center shadow-xl">
          <div className="text-5xl mb-5">📚</div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight dark:text-white">
            Önce Bir Kitap Yayınla
          </h1>
          <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Pano paylaşabilmek için yayınlanmış ve en az bir yayınlanmış bölümü olan bir kitabın bulunmalı.
          </p>
          <button
            type="button"
            onClick={() => router.push('/kitap-ekle')}
            className="mt-8 w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-sm transition-colors"
          >
            Kitap Oluştur
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black">
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter dark:text-white mb-2">
            📋 Yeni Pano Oluştur
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Kendi kitapların hakkında düşüncelerini paylaş!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 rounded-[3rem] border dark:border-white/10 p-8 md:p-12 space-y-6">
          
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
              placeholder="Düşüncelerini, yorumlarını veya önerilerini buraya yaz..."
              className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl text-base outline-none focus:border-blue-600 transition-colors min-h-[200px] resize-none"
            />
            <p className="text-xs text-gray-400 mt-2">{content.length} karakter</p>
          </div>

          {/* ANKET */}
          <div className="rounded-3xl border border-purple-200 bg-purple-50/60 p-5 dark:border-purple-900/40 dark:bg-purple-900/10">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">Anket Ekle</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Oy yüzdeleri herkese görünür.</p>
              </div>
              <input
                type="checkbox"
                checked={hasPoll}
                onChange={(e) => setHasPoll(e.target.checked)}
                className="h-5 w-5 accent-purple-600"
              />
            </label>

            {hasPoll && (
              <div className="mt-5 space-y-4 border-t border-purple-200 pt-5 dark:border-purple-900/40">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-500">Anket Sorusu *</label>
                  <input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    maxLength={200}
                    placeholder="Okurlara ne sormak istersin?"
                    className="w-full rounded-2xl border bg-white p-4 text-sm outline-none focus:border-purple-600 dark:border-white/10 dark:bg-black"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Seçenekler *</label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        value={option}
                        onChange={(e) => setPollOptions(current => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))}
                        maxLength={100}
                        placeholder={`${index + 1}. seçenek`}
                        className="flex-1 rounded-xl border bg-white p-3 text-sm outline-none focus:border-purple-600 dark:border-white/10 dark:bg-black"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions(current => current.filter((_, itemIndex) => itemIndex !== index))}
                          className="rounded-xl px-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          aria-label="Seçeneği kaldır"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(current => [...current, ''])}
                      className="text-xs font-black text-purple-600 hover:text-purple-700"
                    >
                      + Seçenek ekle
                    </button>
                  )}
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 dark:bg-black/40">
                  <input
                    type="checkbox"
                    checked={pollAllowsMultiple}
                    onChange={(e) => setPollAllowsMultiple(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-purple-600"
                  />
                  <span>
                    <span className="block text-xs font-black dark:text-white">Birden fazla seçenek seçilebilsin</span>
                    <span className="mt-1 block text-[11px] text-gray-500">Kapalıysa herkes yalnızca bir seçeneğe oy verebilir.</span>
                  </span>
                </label>
              </div>
            )}
          </div>

          <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-3">
                Pano Görseli {selectedBook || hasPoll ? '(Opsiyonel)' : isAdmin ? '*' : '(Önce kitap seç)'}
              </label>
              <div className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-5 ${
                !selectedBook && !isAdmin
                  ? 'border-gray-200 bg-gray-50 opacity-60 dark:border-white/10 dark:bg-white/5'
                  : 'border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-900/10'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePanoImageUpload}
                  disabled={uploadingImage || saving || (!selectedBook && !isAdmin)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                {panoImageUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-200 p-1 dark:bg-white/10">
                      <BookCoverImage
                        src={panoImageUrl}
                        alt="Pano görseli"
                        className="h-auto max-h-full w-auto max-w-full rounded-lg object-contain"
                        objectFit="contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black dark:text-white">Görsel seçildi</p>
                      <p className="text-xs text-gray-500 mt-1">Panoda kitap kapağı yerine bu görsel gösterilir.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPanoImageUrl('')}
                      className="relative z-10 text-red-600 hover:text-red-700 font-black text-sm"
                    >
                      Kaldır
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-2xl mb-2">+</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                      {uploadingImage
                        ? 'Yükleniyor...'
                        : !selectedBook && !isAdmin
                          ? 'Önce kitap seç'
                          : 'Tek görsel ekle'}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {!selectedBook && !isAdmin
                        ? 'Kitabını seçtikten sonra özel pano görseli ekleyebilirsin.'
                        : !selectedBook && hasPoll
                          ? 'Anket panosu için görsel eklemek zorunda değilsin.'
                        : 'Özel görsel eklemezsen panoda kitabının kapağı gösterilir.'}
                    </p>
                  </div>
                )}
              </div>
          </div>

          {/* KİTAP SEÇİMİ */}
          <div className="relative">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-3">
              Kitap Seç {isAdmin ? '(Opsiyonel)' : '*'} {selectedBook && '✔'}
            </label>
            
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowBookDropdown(true)}
                placeholder="Kitaplarından ara..."
                className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl text-base outline-none focus:border-blue-600 transition-colors"
              />
              
              {showBookDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border dark:border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-50">
                  {filteredBooks.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      {books.length === 0 ? 'Henüz hiç kitabın yok' : 'Kitap bulunamadı'}
                    </div>
                  ) : (
                    filteredBooks.map(book => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => {
                          setSelectedBook(book);
                          setSearchQuery(book.title);
                          setShowBookDropdown(false);
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

                        {/* Kitap Kapağı */}
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10 shrink-0">
                          <BookCoverImage src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate dark:text-white">
                            {book.title}
                          </p>
                          <div className="text-xs mt-1">
                            <Username 
                              username={book.username} 
                              isAdmin={book.is_admin}
                            />
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* SEÇİLEN KİTAP ÖNİZLEME */}
            {selectedBook && (
              <div className="mt-4 flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl">
                {/* Profil Resmi */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 flex items-center justify-center font-black text-sm shrink-0">
                  {selectedBook.avatar_url ? (
                    <img src={selectedBook.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    selectedBook.user_email[0].toUpperCase()
                  )}
                </div>

                {/* Kitap Kapağı */}
                <div className="w-16 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10 shrink-0">
                  <BookCoverImage src={selectedBook.cover_url} alt={selectedBook.title} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1">
                  <p className="font-bold dark:text-white">{selectedBook.title}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    <Username 
                      username={selectedBook.username} 
                      isAdmin={selectedBook.is_admin}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Seçildi ✔</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBook(null);
                    setSearchQuery('');
                    setSelectedChapter(null);
                    if (!isAdmin) setPanoImageUrl('');
                  }}
                  className="text-red-600 hover:text-red-700 font-black text-sm"
                >
                  Kaldır
                </button>
              </div>
            )}
          </div>

          {/* BÖLÜM SEÇİMİ (OPSİYONEL) */}
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
              disabled={
                saving ||
                uploadingImage ||
                !title.trim() ||
                !content.trim() ||
                (!selectedBook && !isAdmin) ||
                (!selectedBook && isAdmin && !panoImageUrl && !hasPoll) ||
                (hasPoll && (
                  pollQuestion.trim().length < 3 ||
                  normalizePollOptions(pollOptions).length < 2 ||
                  new Set(normalizePollOptions(pollOptions).map(option => option.toLocaleLowerCase('tr-TR'))).size !== normalizePollOptions(pollOptions).length
                ))
              }
            >
              {saving ? 'Oluşturuluyor...' : '📋 Panoyu Yayınla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
