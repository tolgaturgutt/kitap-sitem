'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import YorumAlani from '@/components/YorumAlani';
import { Toaster } from 'react-hot-toast';

export default function BolumDetay({ params }) {
  const decodedParams = use(params);
  const id = decodedParams.id;
  const bolumId = decodedParams.bolumId;

  const [data, setData] = useState({ book: null, chapter: null, allChapters: [] });
  const [loading, setLoading] = useState(true);
  const [activePara, setActivePara] = useState(null);
  const [paraCommentCounts, setParaCommentCounts] = useState({});

  // OKUMA AYARLARI STATE
  const [readerSettings, setReaderSettings] = useState({
    fontSize: 20,
    fontFamily: 'font-serif',
    theme: 'bg-[#fdfdfd] text-gray-800' // Varsayılan Gündüz
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Kayıtlı ayarları yükle
    const saved = localStorage.getItem('yazio_reader_settings');
    if (saved) setReaderSettings(JSON.parse(saved));

    async function getFullData() {
      if (!bolumId || !id) return;

      try {
        await supabase.rpc('increment_views', { target_chapter_id: Number(bolumId) });
        
        const { data: chapter } = await supabase.from('chapters').select('*').eq('id', bolumId).single();
        const { data: book } = await supabase.from('books').select('*').eq('id', id).single();
        const { data: all } = await supabase.from('chapters').select('id, title').eq('book_id', id).order('order_no', { ascending: true });
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('reading_history').upsert({
            user_email: user.email,
            book_id: Number(id),
            chapter_id: Number(bolumId),
            updated_at: new Date()
          }, { onConflict: 'user_email, book_id' });
        }

        const { data: counts } = await supabase.from('comments').select('paragraph_id').eq('chapter_id', bolumId).not('paragraph_id', 'is', null);
        const countMap = {};
        counts?.forEach(c => {
          if (c.paragraph_id !== null) {
            countMap[c.paragraph_id] = (countMap[c.paragraph_id] || 0) + 1;
          }
        });

        setData({ book, chapter, allChapters: all || [] });
        setParaCommentCounts(countMap);
      } catch (err) {
        console.error("Yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    }
    getFullData();
  }, [id, bolumId]);

  // Ayarları kaydetme fonksiyonu
  const updateSettings = (newSettings) => {
    const updated = { ...readerSettings, ...newSettings };
    setReaderSettings(updated);
    localStorage.setItem('yazio_reader_settings', JSON.stringify(updated));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black opacity-10 animate-pulse text-5xl italic uppercase tracking-tighter">YUKLENIYOR</div>;
  
  const currentIndex = data.allChapters.findIndex(c => Number(c.id) === Number(bolumId));
  const prevChapter = currentIndex > 0 ? data.allChapters[currentIndex - 1] : null;
  const nextChapter = (currentIndex !== -1 && currentIndex < data.allChapters.length - 1) ? data.allChapters[currentIndex + 1] : null;
  const paragraphs = data.chapter?.content ? data.chapter.content.split('\n') : [];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${readerSettings.theme}`}>
      <Toaster />
      
      {/* ÜST NAVIGASYON */}
      <nav className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[85%] max-w-2xl h-11 bg-white/60 dark:bg-black/60 backdrop-blur-3xl border dark:border-white/5 rounded-full flex items-center justify-between px-6 shadow-sm">
        <Link href={`/kitap/${id}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-all">
          ← {data.book?.title || 'Geri'}
        </Link>
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-all"
        >
          AYARLAR Aa
        </button>
      </nav>

      {/* AYARLAR PANELI */}
      {isSettingsOpen && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[60] w-[85%] max-w-md bg-white dark:bg-gray-900 border dark:border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center mb-8">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Okuma Deneyimi</span>
            <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400">✕</button>
          </div>

          <div className="space-y-8">
            {/* Font Boyutu */}
            <div>
              <div className="flex justify-between mb-4">
                <span className="text-[10px] font-bold uppercase">Yazı Boyutu</span>
                <span className="text-[10px] font-black">{readerSettings.fontSize}px</span>
              </div>
              <input 
                type="range" min="14" max="32" value={readerSettings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-full h-1 bg-gray-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>

            {/* Tema Seçimi */}
            <div className="flex gap-4">
              <button onClick={() => updateSettings({ theme: 'bg-[#fdfdfd] text-gray-800' })} className="flex-1 h-10 rounded-xl bg-[#fdfdfd] border border-gray-200 text-[9px] font-bold text-black uppercase">Gündüz</button>
              <button onClick={() => updateSettings({ theme: 'bg-[#f4ecd8] text-[#5b4636]' })} className="flex-1 h-10 rounded-xl bg-[#f4ecd8] border border-[#e2d6b5] text-[9px] font-bold text-[#5b4636] uppercase">Sepya</button>
              <button onClick={() => updateSettings({ theme: 'bg-[#0a0a0a] text-gray-400' })} className="flex-1 h-10 rounded-xl bg-[#0a0a0a] border border-white/5 text-[9px] font-bold text-gray-400 uppercase">Gece</button>
            </div>

            {/* Font Ailesi */}
            <div className="flex gap-4">
              <button onClick={() => updateSettings({ fontFamily: 'font-serif' })} className={`flex-1 py-3 rounded-xl border text-[10px] font-serif font-bold ${readerSettings.fontFamily === 'font-serif' ? 'border-red-600 text-red-600' : 'dark:border-white/5'}`}>Serif (Klasik)</button>
              <button onClick={() => updateSettings({ fontFamily: 'font-sans' })} className={`flex-1 py-3 rounded-xl border text-[10px] font-sans font-bold ${readerSettings.fontFamily === 'font-sans' ? 'border-red-600 text-red-600' : 'dark:border-white/5'}`}>Sans (Modern)</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center min-h-screen relative">
        <main className="w-full max-w-2xl pt-48 pb-40 px-8 shrink-0">
          <header className="mb-24 text-center">
            <h1 className={`text-4xl md:text-6xl ${readerSettings.fontFamily} tracking-tight mb-4`}>{data.chapter?.title}</h1>
          </header>

          {/* DİNAMİK STİLLER UYGULANDI */}
          <article 
            className={`${readerSettings.fontFamily} leading-[2.1]`}
            style={{ fontSize: `${readerSettings.fontSize}px` }}
          >
            {paragraphs.map((para, i) => {
              if (!para.trim()) return null;
              const paraId = i.toString();
              const count = paraCommentCounts[paraId] || 0;
              return (
                <div key={i} className="relative mb-10 group">
                  <div className={`flex items-start gap-4 transition-all duration-500 rounded-[1.8rem] p-4 -mx-4 ${activePara === paraId ? 'bg-black/5 dark:bg-white/5' : ''}`}>
                    <p className="flex-1">{para}</p>
                    <button onClick={() => setActivePara(activePara === paraId ? null : paraId)} className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all border ${count > 0 || activePara === paraId ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-transparent border-current opacity-20 group-hover:opacity-100 hover:text-red-600'}`}>
                      <span className="text-[9px] font-black">{count > 0 ? count : '+'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </article>

          <footer className="mt-40 flex items-center justify-between gap-6 border-t border-current/10 pt-10">
            {prevChapter ? ( <Link href={`/kitap/${id}/bolum/${prevChapter.id}`} className="flex-1 h-12 flex items-center justify-center rounded-full bg-current/5 text-[9px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">Önceki Bölüm</Link> ) : <div className="flex-1" />}
            {nextChapter ? ( <Link href={`/kitap/${id}/bolum/${nextChapter.id}`} className="flex-1 h-12 flex items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all">Sonraki Bölüm</Link> ) : ( <div className="flex-1 h-12 flex items-center justify-center rounded-full border border-current/20 text-[9px] font-black uppercase opacity-40 text-center">Eserin Sonu</div> )}
          </footer>
        </main>

        <aside className={`fixed top-24 right-8 bottom-8 w-[350px] transition-all duration-500 z-50 ${activePara !== null ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
          <div className="h-full bg-white dark:bg-[#0f0f0f] border dark:border-white/10 rounded-[2.8rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b dark:border-white/5"><span className="text-[9px] font-black uppercase opacity-40 italic">Yorumlar</span><button onClick={() => setActivePara(null)} className="text-gray-400 hover:text-red-600 text-xl">✕</button></div>
            <div className="flex-1 overflow-y-auto p-8 no-scrollbar"><YorumAlani type="paragraph" targetId={bolumId} bookId={id} paraId={activePara} /></div>
          </div>
        </aside>
      </div>
    </div>
  );
}