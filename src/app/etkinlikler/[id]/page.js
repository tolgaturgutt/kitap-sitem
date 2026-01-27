'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username'; // 🔥 SENİN ORİJİNAL BİLEŞENİN (Bunu ekledim)

export default function EtkinlikDetay({ params }) {
    const { id } = use(params);
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [champion, setChampion] = useState(null);
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminEmails, setAdminEmails] = useState([]);

    useEffect(() => {
        init();
    }, [id]);

    async function init() {
        // Kullanıcı kontrolü
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        // Admin listesini çek
        const { data: adminList } = await supabase
            .from('announcement_admins')
            .select('user_email');
            
        // Admin maillerini küçük harfe çevirerek al
        const emails = adminList?.map(a => a.user_email.toLowerCase()) || [];
        setAdminEmails(emails);

        // Kullanıcı admin mi?
        if (currentUser && emails.includes(currentUser.email.toLowerCase())) {
            setIsAdmin(true);
        }

        // Etkinlik bilgisini çek
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

        // Katılımcıları çek
        const { data: participantsData, error: participantsError } = await supabase
            .from('event_participants')
            .select(`
        *,
        book:books(id, title, cover_url, user_email),
        chapter:chapters(id, title, word_count, content)
      `)
            .eq('event_id', id)
            .eq('status', 'active')
            .order('submitted_at', { ascending: true });

        if (!participantsError && participantsData) {
            // Her katılımcı için profil bilgilerini ekle
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
                        // Admin mi kontrolü (Username bileşeni için)
                        is_admin: emails.includes(participant.user_email?.toLowerCase())
                    };
                })
            );

            // Finalistleri ve normal katılımcıları ayır
            
            // Şampiyonu bul
            const championUser = participantsWithProfiles.find(p => p.is_champion);

            setParticipants(participantsWithProfiles);
            setChampion(championUser || null);
        }

        setLoading(false);
    }

    // Şampiyon yapma
    async function setAsChampion(participantId) {
        if (!isAdmin) return;
        if (!confirm('Bu katılımcıyı şampiyon yapmak istediğine emin misin?')) return;

        // Önce tüm şampiyonları kaldır
        await supabase.from('event_participants').update({ is_champion: false }).eq('event_id', id);
        
        // Seçili katılımcıyı şampiyon yap
        const { error } = await supabase.from('event_participants').update({ is_champion: true }).eq('id', participantId);

        if (error) {
            toast.error('İşlem başarısız: ' + error.message);
        } else {
            toast.success('🏆 Şampiyon belirlendi!');
            init();
        }
    }

    // Şampiyonluğu kaldırma
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isEventEnded = event && new Date(event.end_date) < new Date();
    const isEventActive = event && new Date(event.start_date) <= new Date() && new Date(event.end_date) >= new Date();
    const isEventUpcoming = event && new Date(event.start_date) > new Date();

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

    if (!event) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <span className="text-7xl block mb-4">😢</span>
                    <h1 className="text-3xl font-black dark:text-white uppercase mb-3">
                        Etkinlik Bulunamadı
                    </h1>
                    <Link
                        href="/etkinlikler"
                        className="inline-block px-6 py-3 bg-red-600 text-white rounded-full font-black text-sm uppercase hover:bg-red-700 transition-all mt-4"
                    >
                        ← Etkinliklere Dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black text-gray-900 dark:text-gray-100">
            <Toaster />

            <div className="max-w-7xl mx-auto">

                {/* GERİ BUTONU */}
                <Link
                    href="/etkinlikler"
                    className="inline-flex items-center gap-2 mb-8 text-sm font-black text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-600 transition-colors"
                >
                    ← ETKİNLİKLERE DÖN
                </Link>

                {/* ŞAMPİYON BANNER */}
                {champion && (
                    <div className="mb-8 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 p-8 md:p-12 shadow-2xl">
                        <div className="absolute top-0 right-0 text-[200px] opacity-10">🏆</div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-6xl">🏆</span>
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight">ŞAMPİYON</h2>
                                    <p className="text-white/80 font-bold text-lg">Bu etkinliğin kazananı</p>
                                </div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    {champion.avatar_url && (
                                        <img src={champion.avatar_url} className="w-16 h-16 rounded-full border-4 border-white" alt="" />
                                    )}
                                    <div>
                                        <Username 
                                            username={champion.display_username} 
                                            isAdmin={champion.is_admin}
                                            className="text-2xl md:text-3xl font-black text-white"
                                        />
                                    </div>
                                </div>
                                <Link
                                    href={`/kitap/${champion.book_id}`}
                                    className="inline-flex items-center gap-2 text-white hover:text-white/80 font-black transition-colors text-lg"
                                >
                                    <span>📖 {champion.book?.title}</span>
                                    <span>→</span>
                                </Link>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={() => removeChampion(champion.id)}
                                    className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm uppercase transition-all"
                                >
                                    ❌ Şampiyonluğu Kaldır
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ÜST BÖLÜM - ETKİNLİK BİLGİLERİ */}
                <div className="bg-white dark:bg-white/5 rounded-[2.5rem] border dark:border-white/10 overflow-hidden mb-12 shadow-sm">

                    {/* KAPAK RESMİ */}
                    {event.image_url && (
                        <div className="aspect-[21/9] w-full bg-gray-100 dark:bg-black/20 overflow-hidden">
                            <img
                                src={event.image_url}
                                className="w-full h-full object-cover"
                                alt={event.title}
                            />
                        </div>
                    )}

                    <div className="p-8 md:p-12">

                        {/* DURUM BADGE */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            {isEventActive && (
                                <span className="px-4 py-2 bg-green-500 text-white rounded-full text-xs font-black uppercase tracking-widest animate-pulse">
                                    🔥 AKTİF
                                </span>
                            )}
                            {isEventUpcoming && (
                                <span className="px-4 py-2 bg-blue-500 text-white rounded-full text-xs font-black uppercase tracking-widest">
                                    ⏰ YAKINDA
                                </span>
                            )}
                            {isEventEnded && (
                                <span className="px-4 py-2 bg-gray-500 text-white rounded-full text-xs font-black uppercase tracking-widest">
                                    🏁 SONA ERDİ
                                </span>
                            )}
                        </div>

                        {/* BAŞLIK */}
                        <h1 className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tight">
                            {event.title}
                        </h1>

                        {/* TEMA */}
                        {event.theme && (
                            <p className="text-lg text-gray-500 font-bold mb-6">
                                🎨 Konu: "{event.theme}"
                            </p>
                        )}

                        {/* AÇIKLAMA */}
                        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed text-lg max-w-3xl">
                            {event.description}
                        </p>

                        {/* İSTATİSTİKLER */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 dark:bg-black/20 rounded-2xl border dark:border-white/5">
                            <div className="text-center">
                                <p className="text-3xl font-black mb-1">
                                    {participants.length}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-black uppercase">
                                    Katılımcı
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-black mb-1">
                                    {new Date(event.end_date).getDate()}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-black uppercase">
                                    Son Gün
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-black mb-1">
                                    {new Date(event.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-black uppercase">
                                    Başlangıç
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TÜM KATILIMCILAR */}
                <div>
                    {participants.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-white/5 rounded-[2.5rem] border dark:border-white/10">
                                <span className="text-6xl block mb-4">📝</span>
                                <h3 className="text-2xl font-black dark:text-white uppercase mb-2">
                                    Henüz Katılımcı Yok
                                </h3>
                                <p className="text-gray-500">
                                    İlk katılan sen ol!
                                </p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {participants.map((participant, index) => (
                                    <div
                                        key={participant.id}
                                        className="bg-white dark:bg-white/5 rounded-[2rem] border dark:border-white/10 overflow-hidden hover:shadow-xl transition-all group relative"
                                    >
                                        {/* FİNALİST BADGE */}
                                        {participant.is_finalist && (
                                            <div className="absolute top-4 right-4 z-10">
                                                <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">
                                                    ⭐ FİNALİST
                                                </span>
                                            </div>
                                        )}

                                        {/* SIRA NUMARASI */}
                                        <div className="bg-red-600 text-white px-4 py-2 text-center">
                                            <span className="font-black text-sm uppercase tracking-widest">
                                                #{index + 1}
                                            </span>
                                        </div>

                                        <div className="p-6">

                                            {/* 🔥 YAZAR BİLGİSİ - SENİN BİLEŞENİN 🔥 */}
                                            <div className="flex items-center gap-3 mb-4 pb-4 border-b dark:border-white/10">
                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent bg-gray-100 dark:bg-white/10">
                                                    <img src={participant.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <Username 
                                                        username={participant.display_username} 
                                                        isAdmin={participant.is_admin} 
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(participant.submitted_at).toLocaleDateString('tr-TR')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* KİTAP KAPAK */}
                                            {participant.book?.cover_url && (
                                                <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-black/20 mb-4">
                                                    <img
                                                        src={participant.book.cover_url}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        alt={participant.book.title}
                                                    />
                                                </div>
                                            )}

                                            {/* KİTAP BİLGİSİ */}
                                            <h3 className="font-black text-lg mb-2 line-clamp-2">
                                                {participant.book?.title}
                                            </h3>

                                            {/* BÖLÜM BİLGİSİ */}
                                            <p className="text-sm text-gray-500 mb-1">
                                                📖 {participant.chapter?.title}
                                            </p>
                                            <p className="text-xs text-gray-400 mb-4">
                                                ✍️ {participant.chapter?.word_count?.toLocaleString()} kelime
                                            </p>

                                            {/* BUTONLAR */}
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/kitap/${participant.book_id}/bolum/${participant.chapter_id}`}
                                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-xs text-center transition-all shadow-lg shadow-red-600/30"
                                                    >
                                                        📖 OKU
                                                    </Link>
                                                    <Link
                                                        href={`/kitap/${participant.book_id}`}
                                                        className="flex-1 py-3 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20 rounded-xl font-black uppercase text-xs text-center transition-all"
                                                    >
                                                        📚 KİTAP
                                                    </Link>
                                                </div>

                                                {/* 🔥 SADECE ADMİNLER GÖRÜR: ŞAMPİYON TUŞU 🔥 */}
                                                {isAdmin && (
                                                    participant.is_champion ? (
                                                        <button
                                                            onClick={() => removeChampion(participant.id)}
                                                            className="w-full py-3 rounded-xl font-black uppercase text-xs transition-all bg-red-600 hover:bg-red-700 text-white"
                                                        >
                                                            ❌ ŞAMPİYONLUĞU KALDIR
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setAsChampion(participant.id)}
                                                            className="w-full py-3 rounded-xl font-black uppercase text-xs transition-all bg-yellow-500 hover:bg-yellow-600 text-black"
                                                        >
                                                            🏆 ŞAMPİYON YAP
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}