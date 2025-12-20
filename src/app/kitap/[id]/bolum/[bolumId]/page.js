'use client';

import { useEffect, useState, use } from 'react'; // 'use' React'ten gelmeli
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import YorumAlani from '@/components/YorumAlani';
import { Toaster } from 'react-hot-toast';

export default function BolumDetay({ params }) {
  // Params kullanımı Next.js standartlarına uygun hale getirildi
  const decodedParams = use(params);
  const id = decodedParams.id;
  const bolumId = decodedParams.bolumId;

  const [data, setData] = useState({ book: null, chapter: null, allChapters: [] });
  const [loading, setLoading] = useState(true);
  const [activePara, setActivePara] = useState(null);
  const [paraCommentCounts, setParaCommentCounts] = useState({});

  useEffect(() => {
    async function getFullData() {
      if (!bolumId || !id) return;

      try {
        // Okunma sayısını artır
        await supabase.rpc('increment_views', { target_chapter_id: bolumId });
        
        // Verileri çek
        const { data: chapter } = await supabase.from('chapters').select('*').eq('id', bolumId).single();
        const { data: book } = await supabase.from('books').select('*').eq('id', id).single();
        const { data: all } = await supabase.from('chapters').select('id, title').eq('book_id', id).order('order_no', { ascending: true });
        
        // Yorum sayılarını çek
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-black opacity-10 animate-pulse text-5xl italic tracking-tighter">YAZIO</div>;
  }

  // Güvenli indeks hesaplama
  const currentIndex = data.allChapters.findIndex(c => c.id === bolumId);
  const prevChapter = currentIndex > 0 ? data.allChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < data.allChapters.length - 1 ? data.allChapters[currentIndex + 1] : null;

  // İçeriği parçalara ayırma (Çökmeyi engelleyen güvenlik kontrolü)
  const paragraphs = data.chapter?.content ? data.chapter.content.split('\n') : [];

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#0a0a0a]">
      <Toaster />
      
      <nav className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[85%] max-w-2xl h-11 bg-white/60 dark:bg-black/60 backdrop-blur-3xl border dark:border-white/5 rounded-full flex items-center justify-between px-6 shadow-sm ring-1 ring-black/5">
        <Link href={`/kitap/${id}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-all">
          ← {data.book?.title || 'Geri'}
        </Link>
        <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest italic">
           Bölüm {currentIndex !== -1 ? currentIndex + 1 : '-'}
        </span>
      </nav>

      <div className="flex justify-center min-h-screen relative">
        <main className="w-full max-w-2xl pt-48 pb-40 px-8 shrink-0">
          <header className="mb-24 text-center">
            <h1 className="text-5xl md:text-6xl font-serif font-light dark:text-white tracking-tight mb-4">{data.chapter?.title}</h1>
            <div className="w-10 h-[1px] bg-red-600/30 mx-auto"></div>
          </header>

          <article className="font-serif text-[20px] md:text-[22px] leading-[2.1] text-gray-800 dark:text-gray-200">
            {paragraphs.length > 0 ? paragraphs.map((para, i) => {
              if (!para.trim()) return null;
              const paraId = i.toString();
              const count = paraCommentCounts[paraId] || 0;

              return (
                <div key={i} className="relative mb-10 group">
                  <div className={`flex items-start gap-4 transition-all duration-500 rounded-[1.8rem] p-4 -mx-4 ${activePara === paraId ? 'bg-red-50/50 dark:bg-red-950/10 ring-1 ring-red-100 dark:ring-red-900/20' : ''}`}>
                    <p className="flex-1">{para}</p>
                    <button 
                      onClick={() => setActivePara(activePara === paraId ? null : paraId)}
                      className={`shrink-0 w-8 h-8 flex flex-col items-center justify-center rounded-full transition-all duration-300 border
                        ${count > 0 || activePara === paraId
                          ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20 opacity-100' 
                          : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-300 opacity-0 group-hover:opacity-100 hover:border-red-600 hover:text-red-600'
                        }`}
                    >
                      <span className="text-[9px] font-black">{count > 0 ? count : '+'}</span>
                    </button>
                  </div>
                </div>
              );
            }) : (
              <p className="text-center text-gray-400 text-sm italic py-10">Bu bölümün içeriği henüz eklenmemiş.</p>
            )}
          </article>

          <footer className="mt-40 flex items-center justify-between gap-6 border-t dark:border-white/5 pt-10">
            {prevChapter && (
              <Link href={`/kitap/${id}/bolum/${prevChapter.id}`} className="flex-1 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-200 border dark:border-white/5 transition-all">Önceki Bölüm</Link>
            )}
            {!prevChapter && <div className="flex-1" />}

            {nextChapter ? (
              <Link href={`/kitap/${id}/bolum/${nextChapter.id}`} className="flex-1 h-12 flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-red-600 transition-all">Sonraki Bölüm</Link>
            ) : (
              <div className="flex-1 h-12 flex items-center justify-center rounded-full bg-green-600/10 text-green-600 text-[9px] font-black uppercase tracking-widest border border-green-600/20 text-center">Eserin Sonu</div>
            )}
          </footer>
        </main>

        <aside className={`fixed top-24 right-8 bottom-8 w-[350px] transition-all duration-500 ease-out z-50 
          ${activePara !== null ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
          <div className="h-full bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-3xl border dark:border-white/10 rounded-[2.8rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b dark:border-white/5">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 italic">Yorumlar</span>
              <button onClick={() => setActivePara(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-red-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
              <YorumAlani type="paragraph" targetId={bolumId} bookId={id} paraId={activePara} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}