'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';

export default function EtkinlikDetay({ params }) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [champion, setChampion] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);

  const [userBooks, setUserBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapters, setChapters] = useState([]);

  const [showParticipateModal, setShowParticipateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function init() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    setUser(currentUser);

    const { data: adminList } = await supabase.from('announcement_admins').select('user_email');
    const emails = adminList?.map((a) => a.user_email.toLowerCase()) || [];
    setAdminEmails(emails);

    if (currentUser && emails.includes(currentUser.email.toLowerCase())) {
      setIsAdmin(true);
    }

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (eventError || !eventData) {
      toast.error('Etkinlik bulunamadı!');
      setLoading(false);
      return;
    }

    setEvent(eventData);

    const { data: participantsData, error: participantsError } = await supabase
      .from('event_participants')
      .select(
        `
        *,
        book:books(id, title, cover_url, user_email),
        chapter:chapters(id, title, word_count, content)
      `
      )
      .eq('event_id', id)
      .eq('status', 'active')
      .order('submitted_at', { ascending: true });

    if (!participantsError && participantsData) {
      const participantsWithProfiles = await Promise.all(
        participantsData.map(async (participant) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, username')
            .eq('email', participant.user_email)
            .single();

          return {
            ...participant,
            avatar_url: profile?.avatar_url || null,
            display_username: profile?.username || participant.username,
            is_admin: emails.includes(participant.user_email?.toLowerCase()),
          };
        })
      );

      const championUser = participantsWithProfiles.find((p) => p.is_champion);

      setParticipants(participantsWithProfiles);
      setChampion(championUser || null);
    }

    setLoading(false);
  }

  async function handleParticipate() {
    if (!user) {
      toast.error('Katılmak için giriş yapmalısın!');
      return;
    }
    if (participants.some((p) => p.user_email === user.email)) {
      toast.error('Bu etkinliğe zaten katıldın!');
      return;
    }
    if (participants.length >= event.max_participants) {
      toast.error('Bu etkinlik dolu! 😢');
      return;
    }
    await fetchUserEligibleBooks();
    setShowParticipateModal(true);
  }

  async function fetchUserEligibleBooks() {
    const { data: books } = await supabase
      .from('books')
      .select('id, title, cover_url')
      .eq('user_email', user.email)
      .eq('is_draft', false);

    if (!books || books.length === 0) {
      setUserBooks([]);
      return;
    }

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
        eligibleBooks.push({ ...book, eligibleChapters: bookChapters });
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

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || user.email.split('@')[0];

    const { error } = await supabase.from('event_participants').insert([
      {
        event_id: id,
        user_email: user.email,
        username: username,
        book_id: selectedBook.id,
        chapter_id: selectedChapter.id,
        status: 'active',
      },
    ]);

    if (error) {
      toast.error('Katılım sırasında hata: ' + error.message);
      setSubmitting(false);
      return;
    }

    toast.success('🎉 Etkinliğe başarıyla katıldın!');
    setShowParticipateModal(false);
    setSelectedBook(null);
    setSelectedChapter(null);
    setSubmitting(false);
    await init();
  }

  async function handleWithdraw() {
    if (!confirm('Etkinlikten çekilmek istediğine emin misin?')) return;

    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', id)
      .eq('user_email', user.email);

    if (!error) {
      toast.success('Etkinlikten çekildin');
      await init();
    } else {
      toast.error('Hata oluştu');
    }
  }

  async function setAsChampion(participantId) {
    if (!isAdmin) return;
    if (!confirm('Bu katılımcıyı şampiyon yapmak istediğine emin misin?')) return;

    await supabase.from('event_participants').update({ is_champion: false }).eq('event_id', id);

    const { error } = await supabase.from('event_participants').update({ is_champion: true }).eq('id', participantId);

    if (error) {
      toast.error('İşlem başarısız: ' + error.message);
    } else {
      toast.success('🏆 Şampiyon belirlendi!');
      init();
    }
  }

  async function removeChampion(participantId) {
    if (!isAdmin) return;
    if (!confirm('Şampiyonluğu kaldırmak istediğine emin misin?')) return;

    const { error } = await supabase.from('event_participants').update({ is_champion: false }).eq('id', participantId);

    if (error) {
      toast.error('İşlem başarısız: ' + error.message);
    } else {
      toast.success('❌ Şampiyonluk kaldırıldı');
      init();
    }
  }

  const hasChampion = event && participants.some((p) => p.is_champion);
  const dateEnded = event && new Date(event.end_date) < new Date();
  const isEventEnded = dateEnded || hasChampion;
  const isEventActive = event && new Date(event.start_date) <= new Date() && !isEventEnded;
  const isEventUpcoming = event && new Date(event.start_date) > new Date();

  if (loading) {
    return (
      <div className="py-24 sm:py-40 flex justify-center items-center animate-pulse">
        <div className="text-4xl sm:text-5xl font-black tracking-tighter">
          <span className="text-black dark:text-white">Kitap</span>
          <span className="text-red-600">Lab</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <span className="text-6xl sm:text-7xl block mb-3">😢</span>
          <h1 className="text-2xl sm:text-3xl font-black dark:text-white uppercase mb-2">Etkinlik Bulunamadı</h1>
          <Link
            href="/etkinlikler"
            className="inline-block px-5 py-3 bg-red-600 text-white rounded-full font-black text-xs sm:text-sm uppercase hover:bg-red-700 transition-all mt-3"
          >
            ← Etkinliklere Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 sm:py-20 px-3 sm:px-4 md:px-6 bg-[#fafafa] dark:bg-black text-gray-900 dark:text-gray-100">
      <Toaster />

      <div className="max-w-7xl mx-auto">
        {/* GERİ BUTONU */}
        <Link
          href="/etkinlikler"
          className="inline-flex items-center gap-2 mb-5 sm:mb-8 text-xs sm:text-sm font-black text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-600 transition-colors"
        >
          ← ETKİNLİKLERE DÖN
        </Link>

        {/* ŞAMPİYON BANNER */}
        {champion && (
          <div className="mb-5 sm:mb-8 relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 p-4 sm:p-8 md:p-12 shadow-2xl">
            <div className="absolute top-0 right-0 text-[120px] sm:text-[200px] opacity-10">🏆</div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <span className="text-4xl sm:text-6xl">🏆</span>
                <div>
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
                    ŞAMPİYON
                  </h2>
                  <p className="text-white/80 font-bold text-sm sm:text-lg">Bu etkinliğin kazananı</p>
                </div>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  {champion.avatar_url && (
                    <img
                      src={champion.avatar_url}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-white"
                      alt=""
                    />
                  )}
                  <div className="min-w-0">
                    <Username
                      username={champion.display_username}
                      isAdmin={champion.is_admin}
                      className="text-lg sm:text-2xl md:text-3xl font-black text-white"
                    />
                  </div>
                </div>

                <Link
                  href={`/kitap/${champion.book_id}`}
                  className="inline-flex items-center gap-2 text-white hover:text-white/80 font-black transition-colors text-sm sm:text-lg"
                >
                  <span className="truncate">📖 {champion.book?.title}</span>
                  <span>→</span>
                </Link>
              </div>

              {isAdmin && (
                <button
                  onClick={() => removeChampion(champion.id)}
                  className="mt-3 sm:mt-4 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs sm:text-sm uppercase transition-all"
                >
                  ❌ Şampiyonluğu Kaldır
                </button>
              )}
            </div>
          </div>
        )}

        {/* ÜST BÖLÜM */}
        <div className="bg-white dark:bg-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] border dark:border-white/10 overflow-hidden mb-6 sm:mb-12 shadow-sm">
          {event.image_url && (
            <div className="aspect-[21/9] w-full bg-gray-100 dark:bg-black/20 overflow-hidden">
              <img src={event.image_url} className="w-full h-full object-cover" alt={event.title} />
            </div>
          )}

          <div className="p-4 sm:p-8 md:p-12">
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
              {isEventActive && (
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500 text-white rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest animate-pulse">
                  🔥 AKTİF
                </span>
              )}
              {isEventUpcoming && (
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-500 text-white rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest">
                  ⏰ YAKINDA
                </span>
              )}
              {isEventEnded && (
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-500 text-white rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest">
                  🏁 SONA ERDİ
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-6xl font-black mb-2 sm:mb-4 uppercase tracking-tight">
              {event.title}
            </h1>

            {event.theme && (
              <p className="text-sm sm:text-lg text-gray-500 font-bold mb-3 sm:mb-6">🎨 Konu: "{event.theme}"</p>
            )}

            <p className="text-gray-600 dark:text-gray-300 mb-4 sm:mb-8 leading-relaxed text-sm sm:text-lg max-w-3xl">
              {event.description}
            </p>

            <div className="grid grid-cols-3 gap-2 sm:gap-6 p-3 sm:p-6 bg-gray-50 dark:bg-black/20 rounded-2xl border dark:border-white/5">
              <div className="text-center">
                <p className="text-xl sm:text-3xl font-black mb-0.5 sm:mb-1">{participants.length}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-black uppercase">Katılımcı</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-3xl font-black mb-0.5 sm:mb-1">{new Date(event.end_date).getDate()}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-black uppercase">Son Gün</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-3xl font-black mb-0.5 sm:mb-1">
                  {new Date(event.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-black uppercase">Başlangıç</p>
              </div>
            </div>
          </div>

          {/* KATILMA/ÇEKİLME */}
          {user && isEventActive && (
            <div className="px-4 sm:px-8 md:px-12 pb-4 sm:pb-8">
              <div className="mt-3 sm:mt-6 flex gap-2 sm:gap-4">
                {participants.some((p) => p.user_email === user.email) ? (
                  <button
                    onClick={handleWithdraw}
                    className="flex-1 px-4 sm:px-8 py-3 sm:py-4 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-2xl font-black uppercase text-[11px] sm:text-sm hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
                  >
                    ❌ Etkinlikten Çekil
                  </button>
                ) : (
                  <button
                    onClick={handleParticipate}
                    disabled={participants.length >= event.max_participants}
                    className={`flex-1 px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-black uppercase text-[11px] sm:text-sm transition-all ${
                      participants.length >= event.max_participants
                        ? 'bg-gray-300 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30'
                    }`}
                  >
                    {participants.length >= event.max_participants ? '🚫 Dolu' : '🎯 Etkinliğe Katıl'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TÜM KATILIMCILAR */}
        <div>
          {participants.length === 0 ? (
            <div className="text-center py-12 sm:py-20 bg-white dark:bg-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] border dark:border-white/10">
              <span className="text-5xl sm:text-6xl block mb-3 sm:mb-4">📝</span>
              <h3 className="text-xl sm:text-2xl font-black dark:text-white uppercase mb-1.5 sm:mb-2">
                Henüz Katılımcı Yok
              </h3>
              <p className="text-gray-500 text-sm">İlk katılan sen ol!</p>
            </div>
          ) : (
            // ✅ MOBİLDE 2 SÜTUN
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="bg-white dark:bg-white/5 rounded-2xl sm:rounded-[2rem] border dark:border-white/10 overflow-hidden hover:shadow-xl transition-all group relative"
                >
                  {participant.is_finalist && (
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
                      <span className="bg-yellow-500 text-black px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase shadow-lg">
                        ⭐ FİNALİST
                      </span>
                    </div>
                  )}

                  <div className="bg-red-600 text-white px-2.5 py-1.5 sm:px-4 sm:py-2 text-center">
                    <span className="font-black text-[11px] sm:text-sm uppercase tracking-widest">#{index + 1}</span>
                  </div>

                  {/* ✅ MOBİL KART İÇİ KÜÇÜLDÜ */}
                  <div className="p-3 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b dark:border-white/10">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-transparent bg-gray-100 dark:bg-white/10 shrink-0">
                        <img
                          src={
                            participant.avatar_url ||
                            'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
                          }
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <Username username={participant.display_username} isAdmin={participant.is_admin} />
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
                          {new Date(participant.submitted_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>

                    {participant.book?.cover_url && (
                      <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-black/20 mb-3 sm:mb-4">
                        <img
                          src={participant.book.cover_url}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          alt={participant.book.title}
                        />
                      </div>
                    )}

                    <h3 className="font-black text-sm sm:text-lg mb-1.5 sm:mb-2 line-clamp-2">
                      {participant.book?.title}
                    </h3>

                    <p className="text-[11px] sm:text-sm text-gray-500 mb-1 line-clamp-1">
                      📖 {participant.chapter?.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-3 sm:mb-4">
                      ✍️ {participant.chapter?.word_count?.toLocaleString()} kelime
                    </p>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/kitap/${participant.book_id}/bolum/${participant.chapter_id}`}
                          className="flex-1 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] sm:text-xs text-center transition-all shadow-lg shadow-red-600/30"
                        >
                          📖 OKU
                        </Link>
                        <Link
                          href={`/kitap/${participant.book_id}`}
                          className="flex-1 py-2.5 sm:py-3 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20 rounded-xl font-black uppercase text-[10px] sm:text-xs text-center transition-all"
                        >
                          📚 KİTAP
                        </Link>
                      </div>

                      {isAdmin &&
                        (participant.is_champion ? (
                          <button
                            onClick={() => removeChampion(participant.id)}
                            className="w-full py-2.5 sm:py-3 rounded-xl font-black uppercase text-[10px] sm:text-xs transition-all bg-red-600 hover:bg-red-700 text-white"
                          >
                            ❌ ŞAMPİYONLUĞU KALDIR
                          </button>
                        ) : (
                          <button
                            onClick={() => setAsChampion(participant.id)}
                            className="w-full py-2.5 sm:py-3 rounded-xl font-black uppercase text-[10px] sm:text-xs transition-all bg-yellow-500 hover:bg-yellow-600 text-black"
                          >
                            🏆 ŞAMPİYON YAP
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ MODAL ARTIK RETURN İÇİNDE (AÇILMAMA BUG'I BİTTİ) */}
        {showParticipateModal && (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
            onClick={() => setShowParticipateModal(false)}
          >
            <div
              className="bg-white dark:bg-[#111] rounded-3xl p-4 sm:p-8 max-w-2xl w-full shadow-2xl border dark:border-white/10 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-3xl font-black dark:text-white uppercase mb-1 sm:mb-2">
                    🎯 ETKİNLİĞE KATIL
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">{event.title}</p>
                </div>
                <button
                  onClick={() => setShowParticipateModal(false)}
                  className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border-l-4 border-blue-600">
                <p className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 mb-2 uppercase">📋 KURALLAR</p>
                <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Sadece <strong>1 bölüm</strong> gönderebilirsin</li>
                  <li>• Bölüm <strong>2.000 - 10.000 kelime</strong> arasında olmalı</li>
                  <li>• Her etkinliğe <strong>sadece 1 kitapla</strong> katılabilirsin</li>
                  <li>• Bölüm <strong>yayında</strong> olmalı (taslak olmamalı)</li>
                </ul>
              </div>

              {userBooks.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-4xl sm:text-5xl block mb-3 sm:mb-4">😢</span>
                  <p className="text-base sm:text-lg font-bold dark:text-white mb-2">Uygun Kitap Bulunamadı</p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-5 sm:mb-6">
                    2.000-10.000 kelime arasında yayında bir bölümün olmalı.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase mb-2 sm:mb-3">
                      KİTABINI SEÇ *
                    </label>

                    {/* burada kitap seçimi aynı kaldı; sadece mobilde biraz küçültelim */}
                    <div className="grid grid-cols-1 gap-2 sm:gap-3">
                      {userBooks.map((book) => (
                        <button
                          key={book.id}
                          onClick={() => setSelectedBook(book)}
                          className={`p-3 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 sm:gap-4 ${
                            selectedBook?.id === book.id
                              ? 'border-red-600 bg-red-50 dark:bg-red-900/10'
                              : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                          }`}
                        >
                          {book.cover_url && (
                            <img
                              src={book.cover_url}
                              className="w-10 h-14 sm:w-12 sm:h-16 object-cover rounded-lg"
                              alt={book.title}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold dark:text-white text-sm sm:text-base truncate">{book.title}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                              {book.eligibleChapters.length} uygun bölüm
                            </p>
                          </div>
                          {selectedBook?.id === book.id && <span className="text-red-600 font-black">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedBook && (
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase mb-2 sm:mb-3">
                        BÖLÜM SEÇ *
                      </label>
                      <div className="space-y-2">
                        {chapters.map((chapter) => (
                          <button
                            key={chapter.id}
                            onClick={() => setSelectedChapter(chapter)}
                            className={`w-full p-3 sm:p-4 rounded-2xl border-2 text-left transition-all ${
                              selectedChapter?.id === chapter.id
                                ? 'border-red-600 bg-red-50 dark:bg-red-900/10'
                                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                            }`}
                          >
                            <div className="flex justify-between items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold dark:text-white text-sm sm:text-base truncate">
                                  Bölüm {chapter.order_no}: {chapter.title}
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                  {chapter.word_count?.toLocaleString()} kelime
                                </p>
                              </div>
                              {selectedChapter?.id === chapter.id && <span className="text-red-600 font-black">✓</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSubmitParticipation}
                    disabled={!selectedBook || !selectedChapter || submitting}
                    className="w-full py-4 sm:py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    {submitting ? '⏳ GÖNDERİLİYOR...' : '🎯 ETKİNLİĞE KATIL'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
