'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';
import PanoCarousel from '@/components/PanoCarousel';
import PanoModal from '@/components/PanoModal';

const KATEGORILER = [
  "Aksiyon", "Bilim Kurgu", "Biyografi", "Dram", "Fantastik", "Felsefe", "Genel", 
  "Genç Kurgu", "Gizem/Gerilim", "Hayran Kurgu", "Korku", "Kurgu Olmayan", 
  "Kısa Hikaye", "Macera", "Mizah", "Paranormal", "Polisiye", "Romantik", 
  "Senaryo", "Şiir", "Tarihi"
];

// --- YARDIMCI: SAYI FORMATLAMA (1200 -> 1.2K) ---
function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

// --- DUYURU SİSTEMİ ---
function DuyuruPaneli({ isAdmin }) {
  const [duyurular, setDuyurular] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDuyuru, setSelectedDuyuru] = useState(null);

  useEffect(() => {
    async function getDuyurular() {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(10);
      setDuyurular(data || []);
      setLoading(false);
    }
    getDuyurular();
  }, []);

  useEffect(() => {
    if (duyurular.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % duyurular.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [duyurular.length]);

  const getTypeLabel = (type) => {
    const map = { 'mujdede': '🎉 MÜJDE', 'yenilik': '🚀 YENİLİK', 'uyari': '⚠️ UYARI', 'bilgi': 'ℹ️ BİLGİ' };
    return map[type] || map.bilgi;
  };

  async function handleDeleteDuyuru(duyuruId, e) {
    if (e) e.stopPropagation();
    if (!confirm("Bu duyuruyu silmek istediğine emin misin Admin?")) return;
    const { error } = await supabase.from('announcements').delete().eq('id', duyuruId);
    if (!error) {
      setDuyurular(prev => prev.filter(d => d.id !== duyuruId));
      toast.success("Duyuru silindi.");
      if (selectedDuyuru?.id === duyuruId) setSelectedDuyuru(null);
    }
  }

  if (loading || duyurular.length === 0) return null;

  return (
    <>
      {selectedDuyuru && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setSelectedDuyuru(null)}>
          <div className="bg-white dark:bg-[#080808] w-full max-w-5xl h-fit max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedDuyuru(null)} className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/10 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md">✕</button>
            {selectedDuyuru.image_url && selectedDuyuru.display_type !== 'none' && (
              <div className="shrink-0 flex items-center justify-center p-8 bg-gray-50 dark:bg-black/40 md:w-1/2">
                <img src={selectedDuyuru.image_url} className="shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain rounded-2xl max-h-[600px] w-auto" alt="" />
              </div>
            )}
            <div className="p-10 md:p-16 overflow-y-auto flex-1 flex flex-col justify-center">
              <span className="text-xs font-black text-red-600 tracking-[0.3em] uppercase mb-4 block">{getTypeLabel(selectedDuyuru.type)}</span>
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tighter dark:text-white" style={{ color: selectedDuyuru.text_color || '#000000' }}>{selectedDuyuru.title}</h2>
              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed font-medium whitespace-pre-wrap mb-8">{selectedDuyuru.content}</p>
              <div className="mt-auto pt-8 border-t dark:border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{new Date(selectedDuyuru.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <div className="flex gap-3">
                  {selectedDuyuru.action_link && selectedDuyuru.action_text && (
                    <Link href={selectedDuyuru.action_link} className="inline-flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-3 rounded-2xl uppercase tracking-wider transition-all shadow-2xl hover:shadow-red-600/50">{selectedDuyuru.action_text} →</Link>
                  )}
                  {isAdmin && <button onClick={(e) => handleDeleteDuyuru(selectedDuyuru.id, e)} className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-lg">SİL (ADMIN)</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-20">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-6 italic flex items-center gap-2">📢 Duyurular</h2>
        <div className="relative group">
          {duyurular.length > 1 && <button onClick={() => setActiveIndex((prev) => (prev - 1 + duyurular.length) % duyurular.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border dark:border-gray-800 rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110">←</button>}
          {duyurular.length > 1 && <button onClick={() => setActiveIndex((prev) => (prev + 1) % duyurular.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border dark:border-gray-800 rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110">→</button>}
          <div className="overflow-hidden">
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
              {duyurular.map((duyuru, idx) => (
                <div key={idx} className="w-full flex-shrink-0">
                  <div onClick={() => setSelectedDuyuru(duyuru)} className="w-full group/card block bg-white dark:bg-white/5 border dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 hover:border-red-600 transition-all shadow-xl shadow-black/5 cursor-pointer text-left relative">
                    <div className="flex items-center gap-6">
                      {duyuru.image_url && duyuru.display_type !== 'none' && (
                        <div className="shrink-0 rounded-2xl overflow-hidden border dark:border-white/5 shadow-lg h-28 md:h-36 w-auto">
                          <img src={duyuru.image_url} className="h-full w-auto object-cover group-hover/card:scale-110 transition-transform duration-500" alt="" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{getTypeLabel(duyuru.type)}</p>
                        <h3 className="text-2xl md:text-3xl font-black dark:text-white mb-2 group-hover/card:text-red-600 transition-colors uppercase tracking-tight line-clamp-2" style={{ color: duyuru.text_color || '#000000' }}>{duyuru.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{duyuru.content}</p>
                        <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full tracking-tighter mt-4">Detayları Gör →</div>
                      </div>
                    </div>
                    {isAdmin && <button onClick={(e) => handleDeleteDuyuru(duyuru.id, e)} className="absolute top-6 right-6 px-3 py-1 bg-red-600 text-white rounded-full text-[9px] font-black uppercase opacity-0 group-hover/card:opacity-100 transition-opacity z-10">SİL</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {duyurular.length > 1 && <div className="flex justify-center gap-2 mt-6">{duyurular.map((_, idx) => <button key={idx} onClick={() => setActiveIndex(idx)} className={`h-2 rounded-full transition-all ${idx === activeIndex ? 'w-8 bg-red-600' : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'}`} />)}</div>}
        </div>
      </div>
    </>
  );
}

// --- OKUMAYA DEVAM ET ---
function ContinueReadingCarousel({ books }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!books || books.length === 0) return null;

  return (
    <div className="mb-20">
      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-6 italic flex items-center gap-2">📖 Okumaya Devam Et</h2>
      <div className="relative">
        <div className="overflow-hidden">
          <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
            {books.map((item, idx) => (
              <div key={idx} className="w-full flex-shrink-0">
                <Link href={`/kitap/${item.book_id}/bolum/${item.chapter_id}`} className="group block bg-white dark:bg-white/5 border dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 hover:border-red-600 transition-all shadow-xl shadow-black/5">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-28 md:w-24 md:h-36 rounded-2xl overflow-hidden shrink-0 border dark:border-white/5 shadow-lg">
                      <img src={item.books?.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-black dark:text-white mb-2 group-hover:text-red-600 transition-colors uppercase tracking-tight">{item.books?.title}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Kaldığın Bölüm: {item.chapters?.title}</p>
                      
                      {/* İSTATİSTİKLER */}
                      <div className="flex items-center gap-3 mt-2 text-[9px] font-bold text-gray-400 mb-4">
                        <span className="flex items-center gap-1">👁️ {formatNumber(item.books?.totalViews)}</span>
                        <span className="flex items-center gap-1">❤️ {formatNumber(item.books?.totalVotes)}</span>
                        <span className="flex items-center gap-1">💬 {formatNumber(item.books?.totalComments)}</span>
                      </div>

                      <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full tracking-tighter">Hemen Devam Et →</div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center gap-2 mt-6">{books.map((_, idx) => <button key={idx} onClick={() => setActiveIndex(idx)} className={`h-2 rounded-full transition-all ${idx === activeIndex ? 'w-8 bg-red-600' : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'}`} />)}</div>
      </div>
    </div>
  );
}

// ✅ YENİ EKLENEN BÖLÜMLER COMPONENT'İ
function RecentlyAddedChapters({ chapters }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' }); };

  if (!chapters || chapters.length === 0) return null;

  return (
    <div className="mb-20 group relative px-1">
      <div className="flex items-end justify-between mb-5">
         <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 italic flex items-center gap-2">
           🆕 Son Eklenen Bölümler
         </h2>
      </div>

      <button onClick={() => scroll('left')} className="absolute left-[-20px] top-[40%] z-20 bg-white dark:bg-gray-900 border dark:border-gray-800 w-10 h-10 items-center justify-center rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hidden md:flex">←</button>
      <button onClick={() => scroll('right')} className="absolute right-[-20px] top-[40%] z-20 bg-white dark:bg-gray-900 border dark:border-gray-800 w-10 h-10 items-center justify-center rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hidden md:flex">→</button>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x py-2 px-1">
        {chapters.map(chapter => (
          <Link key={chapter.id} href={`/kitap/${chapter.book_id}/bolum/${chapter.id}`} className="flex-none w-32 md:w-40 snap-start group/card">
            {/* KAPAK + BÖLÜM ADI OVERLAY */}
            <div className="relative aspect-[2/3] w-full mb-3 overflow-hidden rounded-2xl border dark:border-gray-800 shadow-md transition-all duration-300 group-hover/card:shadow-xl group-hover/card:-translate-y-1">
              {chapter.books?.cover_url ? (
                <img src={chapter.books.cover_url} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" alt="" />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-900" />
              )}
              
              {/* Bölüm Başlığı Kapak Üstünde */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3 pt-6">
                <p className="text-[10px] text-white font-black uppercase leading-tight line-clamp-2">
                  {chapter.title}
                </p>
              </div>
            </div>
            
            {/* Kitap ve Yazar Bilgisi */}
            <h3 className="font-bold text-[11px] dark:text-white leading-tight truncate group-hover/card:text-red-600 transition-colors">
              {chapter.books?.title}
            </h3>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
               {/* ✅ YENİ: isAdmin prop'u eklendi */}
               <Username username={chapter.books?.username} isAdmin={chapter.is_admin} />
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}


// --- EDİTÖRÜN SEÇİMİ ---
function EditorsChoiceSection({ books }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' }); };

  if (!books || books.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-500 mb-1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          EDİTÖRÜN SEÇİMİ
        </h2>
        <div className="hidden md:flex gap-2">
          <button onClick={() => scroll('left')} className="w-8 h-8 rounded-full border border-yellow-600/20 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 flex items-center justify-center text-yellow-600 transition-all text-sm">←</button>
          <button onClick={() => scroll('right')} className="w-8 h-8 rounded-full border border-yellow-600/20 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 flex items-center justify-center text-yellow-600 transition-all text-sm">→</button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x py-4 px-2">
        {books.map(kitap => (
          <Link key={kitap.id} href={`/kitap/${kitap.id}`} className="flex-none w-36 md:w-48 snap-start group">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden transition-all duration-300 border-2 border-yellow-500/40 group-hover:border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] group-hover:shadow-[0_0_25px_rgba(234,179,8,0.5)]">
               <img src={kitap.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={kitap.title} />
            </div>
            
            <div className="mt-3">
              <h3 className="text-sm font-black dark:text-white leading-tight mb-1 truncate group-hover:text-yellow-500 transition-colors flex items-center gap-1.5">
                <div className="shrink-0" title="Editörün Seçimi">
                   <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-500 drop-shadow-sm"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                </div>
                <span className="truncate">{kitap.title}</span>
              </h3>

              {kitap.is_completed && (
                <div className="mb-1">
                  <span className="text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
                    ✅ Tamamlandı
                  </span>
                </div>
              )}

              <p className="text-[9px] font-bold uppercase tracking-widest pl-6"> 
                <Username username={kitap.username} isAdmin={kitap.is_admin} />
              </p>

              {/* ✅ İSTATİSTİKLER */}
              <div className="flex items-center gap-3 mt-2 pl-1 text-[9px] font-bold text-gray-400">
                <span className="flex items-center gap-1">👁️ {formatNumber(kitap.totalViews)}</span>
                <span className="flex items-center gap-1">❤️ {formatNumber(kitap.totalVotes)}</span>
                <span className="flex items-center gap-1">💬 {formatNumber(kitap.totalComments)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- KATEGORİ SATIRI ---
function CategoryRow({ title, books, isFeatured = false }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' }); };

  if (books.length === 0) return null;

  return (
    <div className="mb-14 group relative px-1">
      <div className="flex items-end justify-between mb-5">
        <h2 className="text-xl font-black tracking-tighter uppercase dark:text-white flex items-center gap-2">
          {isFeatured && '🔥 '}{title} <span className={`w-1.5 h-1.5 rounded-full ${isFeatured ? 'bg-orange-500' : 'bg-red-600'}`}></span>
        </h2>
        {!isFeatured && <Link href={`/kategori/${title.toLowerCase().replace(/\s+/g, '-')}`} className="text-[10px] font-black uppercase text-gray-400 hover:text-red-600 tracking-widest transition-all">Tümünü Gör</Link>}
      </div>

      <button onClick={() => scroll('left')} className="absolute left-[-20px] top-[40%] z-20 bg-white dark:bg-gray-900 border dark:border-gray-800 w-10 h-10 items-center justify-center rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hidden md:flex">←</button>
      <button onClick={() => scroll('right')} className="absolute right-[-20px] top-[40%] z-20 bg-white dark:bg-gray-900 border dark:border-gray-800 w-10 h-10 items-center justify-center rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hidden md:flex">→</button>

      <div ref={scrollRef} className="flex gap-5 overflow-x-auto scrollbar-hide snap-x py-2 px-1">
        {books.map(kitap => (
          <Link key={kitap.id} href={`/kitap/${kitap.id}`} className="flex-none w-36 md:w-44 snap-start group/card">
            <div className={`relative aspect-[2/3] w-full mb-3 overflow-hidden rounded-2xl border dark:border-gray-800 shadow-md transition-all duration-500 group-hover/card:shadow-2xl group-hover/card:-translate-y-2 ${isFeatured ? 'border-orange-500/30' : ''}`}>
              {kitap.cover_url ? <img src={kitap.cover_url} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" alt={kitap.title} /> : <div className="w-full h-full bg-gray-50 dark:bg-gray-900" />}
              {isFeatured && <div className="absolute top-2 right-2 bg-orange-600 text-[8px] font-black text-white px-2 py-1 rounded-full uppercase shadow-lg">Trend</div>}
            </div>
            
            <h3 className="flex items-center gap-1.5 font-bold text-[13px] dark:text-white mb-0.5 group-hover/card:text-red-600 transition-colors">
              {kitap.is_editors_choice && <div className="shrink-0" title="Editörün Seçimi"><svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-yellow-500 drop-shadow-sm"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg></div>}
              <span className="truncate line-clamp-1">{kitap.title}</span>
            </h3>

            {kitap.is_completed && (
              <div className="mb-1">
                <span className="text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  ✅ Tamamlandı
                </span>
              </div>
            )}
            
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              <Username username={kitap.username} isAdmin={kitap.is_admin} />
            </p>

            {/* ✅ İSTATİSTİKLER */}
            <div className="flex items-center gap-3 mt-2 text-[9px] font-bold text-gray-400">
               <span className="flex items-center gap-1">👁️ {formatNumber(kitap.totalViews)}</span>
               <span className="flex items-center gap-1">❤️ {formatNumber(kitap.totalVotes)}</span>
               <span className="flex items-center gap-1">💬 {formatNumber(kitap.totalComments)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- EN ÇOK OKUNANLAR ---
function TopReadRow({ books }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' }); };

  if (!books || books.length === 0) return null;

  return (
    <div className="mb-14 group relative px-1">
      <div className="flex items-end justify-between mb-5">
        <h2 className="text-xl font-black tracking-tighter uppercase dark:text-white flex items-center gap-2">🏆 EN ÇOK OKUNANLAR</h2>
        <Link href="/en-cok-okunanlar" className="text-[10px] font-black uppercase text-gray-400 hover:text-red-600 tracking-widest transition-all">TOP 100 LİSTESİ →</Link>
      </div>

      <button onClick={() => scroll('left')} className="absolute left-[-20px] top-[40%] z-20 bg-white dark:bg-gray-900 border dark:border-gray-800 w-10 h-10 items-center justify-center rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hidden md:flex">←</button>
      <button onClick={() => scroll('right')} className="absolute right-[-20px] top-[40%] z-20 bg-white dark:bg-gray-900 border dark:border-gray-800 w-10 h-10 items-center justify-center rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hidden md:flex">→</button>

      <div ref={scrollRef} className="flex gap-5 overflow-x-auto scrollbar-hide snap-x py-2 px-1">
        {books.map((kitap, index) => (
          <Link key={kitap.id} href={`/kitap/${kitap.id}`} className="flex-none w-36 md:w-44 snap-start group/card relative">
            <div className="absolute top-0 left-0 z-10 bg-red-600 text-white font-black text-xs px-2.5 py-1.5 rounded-br-xl rounded-tl-xl shadow-lg border-b-2 border-r-2 border-black/20">#{index + 1}</div>
            <div className="relative aspect-[2/3] w-full mb-3 overflow-hidden rounded-2xl border dark:border-gray-800 shadow-md transition-all duration-500 group-hover/card:shadow-2xl group-hover/card:-translate-y-2">
              {kitap.cover_url ? <img src={kitap.cover_url} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" alt={kitap.title} /> : <div className="w-full h-full bg-gray-50 dark:bg-gray-900" />}
            </div>
            
            <h3 className="font-bold text-[13px] dark:text-white mb-0.5 group-hover/card:text-red-600 transition-colors truncate">{kitap.title}</h3>
            
            {kitap.is_completed && (
              <div className="mb-1">
                <span className="text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  ✅ Tamamlandı
                </span>
              </div>
            )}

            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              <Username username={kitap.username} isAdmin={kitap.is_admin} />
            </p>
            
            {/* ✅ İSTATİSTİKLER */}
            <div className="flex items-center gap-3 mt-2 text-[9px] font-bold text-gray-400">
               <span className="flex items-center gap-1">👁️ {formatNumber(kitap.totalViews)}</span>
               <span className="flex items-center gap-1">❤️ {formatNumber(kitap.totalVotes)}</span>
               <span className="flex items-center gap-1">💬 {formatNumber(kitap.totalComments)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- ANA SAYFA ---
export default function Home() {
  const [user, setUser] = useState(null);
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [editorsChoiceBooks, setEditorsChoiceBooks] = useState([]); 
  const [topReadBooks, setTopReadBooks] = useState([]);
  const [booksByCategory, setBooksByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [continueReading, setContinueReading] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);
  const [selectedPano, setSelectedPano] = useState(null);
  const [latestChapters, setLatestChapters] = useState([]); // ✅ YENİ STATE

  useEffect(() => {
    async function fetchData() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      setUser(activeUser);

      // Admin kontrolü
      if (activeUser) {
        const { data: adminData } = await supabase.from('announcement_admins').select('*').eq('user_email', activeUser.email).single();
        if (adminData) setIsAdmin(true);
      }

      const { data: adminList } = await supabase.from('announcement_admins').select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      setAdminEmails(emails);

      // OKUMAYA DEVAM ET
      if (activeUser) {
        const { data: history } = await supabase
          .from('reading_history')
          .select('*, books(*, chapters(id, views, chapter_votes(chapter_id))), chapters(*)')
          .eq('user_email', activeUser.email)
          .order('updated_at', { ascending: false })
          .limit(5);

        const historyWithStats = history?.map(item => {
          if (!item.books) return item;
          const book = item.books;
          const totalViews = book.chapters?.reduce((sum, c) => sum + (c.views || 0), 0) || 0;
          const totalVotes = book.chapters?.reduce((sum, c) => sum + (c.chapter_votes?.length || 0), 0) || 0;
          return {
            ...item,
            books: { ...book, totalViews, totalVotes, totalComments: 0 } 
          };
        });
        setContinueReading(historyWithStats || []);
      }

      // ✅ YENİ: SON EKLENEN BÖLÜMLERİ ÇEK (Admin kontrolü için user_email eklendi)
      const { data: recentChaps } = await supabase
        .from('chapters')
        .select('id, title, created_at, book_id, books!inner(title, cover_url, username, is_draft, user_email)')
        .eq('books.is_draft', false)
        .order('created_at', { ascending: false })
        .limit(20);
      
      // Admin tikini ekle
      const recentChapsWithAdmin = recentChaps?.map(c => ({
          ...c,
          is_admin: emails.includes(c.books?.user_email)
      })) || [];

      setLatestChapters(recentChapsWithAdmin);


      // 1. Kitapları ve Bölümleri Çek
      let { data: allBooks, error: booksError } = await supabase
        .from('books')
        .select('*, chapters(id, views)');
      
      if (booksError) {
        setLoading(false);
        return;
      }

      // 2. Tüm Yorumları Çek
      const { data: allComments } = await supabase.from('comments').select('book_id');
      
      // 3. Tüm Bölüm Oylarını Çek
      const { data: allVotes } = await supabase.from('chapter_votes').select('chapter_id');

      if (allBooks) {
        allBooks = allBooks.filter(book => book.chapters && book.chapters.length > 0 && !book.is_draft);

        allBooks = allBooks.map(book => {
          const totalViews = book.chapters.reduce((sum, c) => sum + (c.views || 0), 0);
          const chapterIds = book.chapters.map(c => c.id);
          const totalVotes = allVotes?.filter(v => chapterIds.includes(v.chapter_id)).length || 0;
          const totalComments = allComments?.filter(c => c.book_id === book.id).length || 0;

          return { 
            ...book, 
            is_admin: emails.includes(book.user_email),
            totalViews,
            totalVotes,
            totalComments
          };
        });
      }

      const editorsPicks = allBooks?.filter(b => b.is_editors_choice).slice(0, 10);
      setEditorsChoiceBooks(editorsPicks || []);

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const { data: recentComments } = await supabase.from('comments').select('book_id').gte('created_at', tenDaysAgo.toISOString());
      const { data: recentFollows } = await supabase.from('follows').select('book_id').gte('created_at', tenDaysAgo.toISOString());
      const { data: recentVotes } = await supabase.from('chapter_votes').select('chapter_id').gte('created_at', tenDaysAgo.toISOString());

      if (allBooks) {
        const scored = allBooks.map(b => {
          const rVotesCount = recentVotes?.filter(v => b.chapters.some(c => c.id === v.chapter_id)).length || 0;
          const rCommentsCount = recentComments?.filter(c => c.book_id === b.id).length || 0;
          const rFollowsCount = recentFollows?.filter(f => f.book_id === b.id).length || 0;
          
          const score = (b.totalViews * 0.1) + (rVotesCount * 5) + (rCommentsCount * 10) + (rFollowsCount * 20);
          return { ...b, interactionScore: score };
        });

        setFeaturedBooks(scored.sort((a, b) => b.interactionScore - a.interactionScore).slice(0, 15));
        
        const mostRead = [...scored].sort((a, b) => b.totalViews - a.totalViews).slice(0, 20);
        setTopReadBooks(mostRead);

        const grouped = {};
        KATEGORILER.forEach(cat => {
          const categoryBooks = scored.filter(b => b.category === cat);
          grouped[cat] = categoryBooks.sort((a, b) => b.interactionScore - a.interactionScore).slice(0, 20);
        });
        setBooksByCategory(grouped);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="py-40 flex justify-center items-center animate-pulse">
      <div className="text-5xl font-black tracking-tighter"><span className="text-black dark:text-white">Kitap</span><span className="text-red-600">Lab</span></div>
    </div>
  );

  return (
    <div className="min-h-screen py-16 px-6 md:px-16 bg-[#fafafa] dark:bg-black">
      <Toaster />
      <PanoModal selectedPano={selectedPano} onClose={() => setSelectedPano(null)} user={user} adminEmails={adminEmails} isAdmin={isAdmin} isOwner={user && selectedPano && (user.email === selectedPano.user_email)} />
      
      <div className="max-w-7xl mx-auto">
        <DuyuruPaneli isAdmin={isAdmin} />
        <PanoCarousel onPanoClick={(pano) => setSelectedPano(pano)} />
        
        {/* ✅ YENİ EKLENEN BÖLÜMLER (Araya eklendi) */}
        <RecentlyAddedChapters chapters={latestChapters} />
        
        <EditorsChoiceSection books={editorsChoiceBooks} />
        <ContinueReadingCarousel books={continueReading} />
        <TopReadRow books={topReadBooks} />
        <CategoryRow title="Öne Çıkanlar" books={featuredBooks} isFeatured={true} />
        {Object.entries(booksByCategory).map(([cat, books]) => <CategoryRow key={cat} title={cat} books={books} />)}
      </div>
    </div>
  );
}