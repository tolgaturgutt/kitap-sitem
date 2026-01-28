'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function EtkinliklerSayfasi() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userBooks, setUserBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [showParticipateModal, setShowParticipateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('aktif'); // 'aktif' veya 'gecmis'

  useEffect(() => {
    init();
  }, []);

  async function init() {
    // Kullanıcı kontrolü
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    // Etkinlikleri çek
    await fetchEvents();
    
    setLoading(false);
  }

  async function fetchEvents() {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_participants(
          id,
          user_email,
          username,
          book_id,
          chapter_id,
          submitted_at,
          is_champion
        )
      `)
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (!error && data) {
      // Aktif ve geçmiş etkinlikleri ayır - şampiyon seçildiyse geçmiş sayılır
      const aktifEtkinlikler = data.filter(e => {
        const hasChampion = e.event_participants?.some(p => p.is_champion);
        const dateEnded = new Date(e.end_date) < new Date(now);
        return !dateEnded && !hasChampion; // Tarihi geçmemiş VE şampiyon yok
      });
      
      const gecmisEtkinlikler = data.filter(e => {
        const hasChampion = e.event_participants?.some(p => p.is_champion);
        const dateEnded = new Date(e.end_date) < new Date(now);
        return dateEnded || hasChampion; // Tarihi geçmiş VEYA şampiyon var
      });
      
      setEvents({
        aktif: aktifEtkinlikler,
        gecmis: gecmisEtkinlikler
      });
    }
  }

  async function handleEventClick(event) {
    if (!user) {
      toast.error('Katılmak için giriş yapmalısın!');
      router.push('/giris');
      return;
    }

    // Etkinlik dolu mu kontrol et
    if (event.event_participants.length >= event.max_participants) {
      toast.error('Bu etkinlik dolu! 😢');
      return;
    }

    // Kullanıcı zaten katılmış mı?
    const alreadyParticipated = event.event_participants.some(p => p.user_email === user.email);
    if (alreadyParticipated) {
      toast.error('Bu etkinliğe zaten katıldın!');
      return;
    }

    // Etkinlik bitmiş mi?
    if (new Date(event.end_date) < new Date()) {
      toast.error('Bu etkinlik sona erdi!');
      return;
    }

    setSelectedEvent(event);
    
    // Kullanıcının uygun kitaplarını çek
    await fetchUserEligibleBooks();
    
    setShowParticipateModal(true);
  }

  async function fetchUserEligibleBooks() {
    // Kullanıcının yayında olan kitaplarını çek
    const { data: books } = await supabase
      .from('books')
      .select('id, title, cover_url')
      .eq('user_email', user.email)
      .eq('is_draft', false);

    if (!books || books.length === 0) {
      setUserBooks([]);
      return;
    }

    // Her kitap için bölümleri kontrol et (2k-10k kelime arası)
    const eligibleBooks = [];
    
    for (const book of books) {
      const { data: bookChapters } = await supabase
        .from('chapters')
        .select('id, title, word_count, order_no')
        .eq('book_id', book.id)
        .eq('is_draft', false)
        .gte('word_count', 2000)
        .lte('word_count', 10000)
        .order('order_no', { ascending: true });

      if (bookChapters && bookChapters.length > 0) {
        eligibleBooks.push({
          ...book,
          eligibleChapters: bookChapters
        });
      }
    }

    setUserBooks(eligibleBooks);
  }

  useEffect(() => {
    if (selectedBook) {
      setChapters(selectedBook.eligibleChapters || []);
      setSelectedChapter(null);
    }
  }, [selectedBook]);

  async function handleSubmitParticipation() {
    if (!selectedBook || !selectedChapter) {
      toast.error('Lütfen kitap ve bölüm seç!');
      return;
    }

    setSubmitting(true);

    // Kullanıcı adını al
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const username = profile?.username || user.email.split('@')[0];

    const { error } = await supabase
      .from('event_participants')
      .insert([{
        event_id: selectedEvent.id,
        user_email: user.email,
        username: username,
        book_id: selectedBook.id,
        chapter_id: selectedChapter.id,
        status: 'active'
      }]);

    if (error) {
      toast.error('Katılım sırasında hata: ' + error.message);
      setSubmitting(false);
      return;
    }

    toast.success('🎉 Etkinliğe başarıyla katıldın!');
    setShowParticipateModal(false);
    setSelectedEvent(null);
    setSelectedBook(null);
    setSelectedChapter(null);
    setSubmitting(false);
    
    // Etkinlikleri yenile
    fetchEvents();
  }

  async function handleWithdraw(eventId) {
    if (!confirm('Etkinlikten çekilmek istediğine emin misin?')) return;

    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_email', user.email);

    if (!error) {
      toast.success('Etkinlikten çekildin');
      fetchEvents();
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="py-40 flex justify-center items-center animate-pulse">
        <div className="text-5xl font-black tracking-tighter">
          <span className="text-black dark:text-white">Kitap</span>
          <span className="text-red-600">Lab</span>
        </div>
      </div>
    );
  }

  const displayEvents = events[activeTab] || [];

  return (
    <div className="min-h-screen py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black">
      <Toaster />
      
      <div className="max-w-7xl mx-auto">
        
        {/* BAŞLIK */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter dark:text-white mb-4">
            🎯 ETKİNLİKLER
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Yaratıcılığını sergile, ödüller kazan ve topluluğumuzun bir parçası ol!
          </p>
        </div>

       {/* SEKMELER */}
        <div className="flex justify-center gap-2 md:gap-4 mb-8 md:mb-12">
          <button
            onClick={() => setActiveTab('aktif')}
            className={`px-4 py-2.5 md:px-8 md:py-4 rounded-full font-black uppercase text-[10px] md:text-sm tracking-wide md:tracking-widest transition-all flex items-center gap-1 md:gap-2 ${
              activeTab === 'aktif'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border dark:border-white/10'
            }`}
          >
            <span className="text-base md:text-lg">🔥</span> 
            <span>AKTİF <span className="hidden md:inline">ETKİNLİKLER</span> ({events.aktif?.length || 0})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('gecmis')}
            className={`px-4 py-2.5 md:px-8 md:py-4 rounded-full font-black uppercase text-[10px] md:text-sm tracking-wide md:tracking-widest transition-all flex items-center gap-1 md:gap-2 ${
              activeTab === 'gecmis'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border dark:border-white/10'
            }`}
          >
            <span className="text-base md:text-lg">📚</span>
            <span>GEÇMİŞ <span className="hidden md:inline">ETKİNLİKLER</span> ({events.gecmis?.length || 0})</span>
          </button>
        </div>

        {/* ETKİNLİKLER LİSTESİ */}
        {displayEvents.length === 0 ? (
          <div className="text-center py-32">
            <span className="text-7xl block mb-6">
              {activeTab === 'aktif' ? '🎯' : '📦'}
            </span>
            <h2 className="text-3xl font-black dark:text-white uppercase mb-3">
              {activeTab === 'aktif' ? 'Henüz Aktif Etkinlik Yok' : 'Geçmiş Etkinlik Yok'}
            </h2>
            <p className="text-gray-400">
              {activeTab === 'aktif' 
                ? 'Yakında yeni etkinlikler eklenecek, takipte kal!' 
                : 'Henüz tamamlanmış bir etkinlik bulunmuyor.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {displayEvents.map(event => {
              const isUserParticipated = user && event.event_participants.some(p => p.user_email === user.email);
              const isFull = event.event_participants.length >= event.max_participants;
              const hasChampion = event.event_participants.some(p => p.is_champion);
              const dateEnded = new Date(event.end_date) < new Date(); // Sadece tarih kontrolü
              const isEnded = dateEnded || hasChampion; // Görünüm için (badge vs)
              const canJoin = !dateEnded && !isFull; // Katılım için sadece tarih ve dolu kontrolü
              const participantCount = event.event_participants.length;

              return (
                <div
                  key={event.id}
                  className="bg-white dark:bg-white/5 rounded-2xl md:rounded-[2.5rem] border dark:border-white/10 overflow-hidden hover:shadow-2xl transition-all group"
                >
                  {/* KAPAK RESMİ */}
                  {event.image_url && (
                    <div className="aspect-video w-full bg-gray-100 dark:bg-black/20 overflow-hidden">
                      <img 
                        src={event.image_url} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        alt={event.title}
                      />
                    </div>
                  )}

                  <div className="p-4 md:p-8">
                    {/* BAŞLIK */}
                    <h2 className="text-xl md:text-3xl font-black dark:text-white mb-2 md:mb-3 uppercase tracking-tight">
                      {event.title}
                    </h2>

                    {/* TEMA */}
                    {event.theme && (
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-3 md:mb-4">
                        🎨 <span className="font-bold">{event.theme}</span>
                      </p>
                    )}

                    {/* AÇIKLAMA */}
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-4 md:mb-6 leading-relaxed line-clamp-3 md:line-clamp-none">
                      {event.description}
                    </p>

                    {/* BİLGİLER */}
                    <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                      <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                        <span className="font-black text-gray-400 uppercase text-[10px] md:text-xs">📅 Başlangıç:</span>
                        <span className="dark:text-white font-bold text-xs md:text-sm">{formatDate(event.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                        <span className="font-black text-gray-400 uppercase text-[10px] md:text-xs">🏁 Bitiş:</span>
                        <span className="dark:text-white font-bold text-xs md:text-sm">{formatDate(event.end_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                        <span className="font-black text-gray-400 uppercase text-[10px] md:text-xs">👥 Katılımcılar:</span>
                        <span className="dark:text-white font-bold text-xs md:text-sm">
                          {participantCount} / {event.max_participants}
                        </span>
                        <div className="flex-1 bg-gray-200 dark:bg-white/10 rounded-full h-1.5 md:h-2 overflow-hidden">
                          <div 
                            className="bg-red-600 h-full rounded-full transition-all"
                            style={{ width: `${(participantCount / event.max_participants) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* BUTONLAR */}
                    <div className="flex gap-2 md:gap-3">
                      {isEnded ? (
                        // Geçmiş etkinlik - sadece detaylar butonu
                        <Link
                          href={`/etkinlikler/${event.id}`}
                          className="flex-1 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm text-center hover:bg-blue-700 transition-all"
                        >
                          📋 DETAYLAR
                        </Link>
                      ) : (
                        // Aktif etkinlik - katılma/çekilme butonları
                        <>
                          {isUserParticipated ? (
                            <>
                              <button
                                onClick={() => handleWithdraw(event.id)}
                                className="flex-1 py-3 md:py-4 bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
                              >
                                ❌ ÇEKİL
                              </button>
                              <Link
                                href={`/etkinlikler/${event.id}`}
                                className="flex-1 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm text-center hover:bg-blue-700 transition-all"
                              >
                                📋 DETAYLAR
                              </Link>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEventClick(event)}
                                disabled={!canJoin}
                                className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm transition-all ${
                                  !canJoin
                                    ? 'bg-gray-300 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                                    : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30'
                                }`}
                              >
                                {dateEnded ? '⏰ SONA ERDİ' : isFull ? '🚫 DOLU' : '🎯 KATIL'}
                              </button>
                              <Link
                                href={`/etkinlikler/${event.id}`}
                                className="flex-1 py-3 md:py-4 bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm text-center hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
                              >
                                📋 DETAYLAR
                              </Link>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KATILIM MODAL */}
      {showParticipateModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowParticipateModal(false)}
        >
          <div 
            className="bg-white dark:bg-[#111] rounded-3xl p-8 max-w-2xl w-full shadow-2xl border dark:border-white/10 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black dark:text-white uppercase mb-2">
                  🎯 ETKİNLİĞE KATIL
                </h2>
                <p className="text-sm text-gray-500">{selectedEvent?.title}</p>
              </div>
              <button 
                onClick={() => setShowParticipateModal(false)} 
                className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
              >
                ✕
              </button>
            </div>

            {/* KURALLAR */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border-l-4 border-blue-600">
              <p className="text-sm font-black text-blue-600 dark:text-blue-400 mb-2 uppercase">📋 KURALLAR</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Sadece <strong>1 bölüm</strong> gönderebilirsin</li>
                <li>• Bölüm <strong>2.000 - 10.000 kelime</strong> arasında olmalı</li>
                <li>• Her etkinliğe <strong>sadece 1 kitapla</strong> katılabilirsin</li>
                <li>• Bölüm <strong>yayında</strong> olmalı (taslak olmamalı)</li>
              </ul>
            </div>

            {userBooks.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-5xl block mb-4">😢</span>
                <p className="text-lg font-bold dark:text-white mb-2">Uygun Kitap Bulunamadı</p>
                <p className="text-sm text-gray-500 mb-6">
                  2.000-10.000 kelime arasında yayında bir bölümün olmalı.
                </p>
                <Link
                  href="/kitap-ekle"
                  className="inline-block px-6 py-3 bg-red-600 text-white rounded-full font-black text-sm uppercase hover:bg-red-700 transition-all"
                >
                  ➕ KİTAP EKLE
                </Link>
              </div>
            ) : (
              <>
                {/* KİTAP SEÇİMİ */}
                <div className="mb-6">
                  <label className="block text-xs font-black text-gray-400 uppercase mb-3">
                    KİTABINI SEÇ *
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {userBooks.map(book => (
                      <button
                        key={book.id}
                        onClick={() => setSelectedBook(book)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                          selectedBook?.id === book.id
                            ? 'border-red-600 bg-red-50 dark:bg-red-900/10'
                            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                        }`}
                      >
                        {book.cover_url && (
                          <img src={book.cover_url} className="w-12 h-16 object-cover rounded-lg" alt={book.title} />
                        )}
                        <div className="flex-1">
                          <p className="font-bold dark:text-white">{book.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {book.eligibleChapters.length} uygun bölüm
                          </p>
                        </div>
                        {selectedBook?.id === book.id && (
                          <span className="text-red-600 font-black">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BÖLÜM SEÇİMİ */}
                {selectedBook && (
                  <div className="mb-6">
                    <label className="block text-xs font-black text-gray-400 uppercase mb-3">
                      BÖLÜM SEÇ *
                    </label>
                    <div className="space-y-2">
                      {chapters.map(chapter => (
                        <button
                          key={chapter.id}
                          onClick={() => setSelectedChapter(chapter)}
                          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                            selectedChapter?.id === chapter.id
                              ? 'border-red-600 bg-red-50 dark:bg-red-900/10'
                              : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="font-bold dark:text-white">
                                Bölüm {chapter.order_no}: {chapter.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {chapter.word_count?.toLocaleString()} kelime
                              </p>
                            </div>
                            {selectedChapter?.id === chapter.id && (
                              <span className="text-red-600 font-black ml-4">✓</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* GÖNDER BUTONU */}
                <button
                  onClick={handleSubmitParticipation}
                  disabled={!selectedBook || !selectedChapter || submitting}
                  className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '⏳ GÖNDERİLİYOR...' : '🎯 ETKİNLİĞE KATIL'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}