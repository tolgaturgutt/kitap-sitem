'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import YorumAlani from '@/components/YorumAlani';
import { Toaster, toast } from 'react-hot-toast';
import { createChapterVoteNotification } from '@/lib/notifications'; 

export default function BolumDetay({ params }) {
  const decodedParams = use(params);
  const id = decodedParams.id;
  const bolumId = decodedParams.bolumId;

  const [data, setData] = useState({ book: null, chapter: null, allChapters: [] });
  const [loading, setLoading] = useState(true);
  const [activePara, setActivePara] = useState(null);
  const [paraCommentCounts, setParaCommentCounts] = useState({});
  const [user, setUser] = useState(null);

  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  const [readerSettings, setReaderSettings] = useState({
    fontSize: 20,
    fontFamily: 'font-serif',
    theme: 'bg-[#fdfdfd] text-gray-800'
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    const saved = localStorage.getItem('yazio_reader_settings');
    if (saved) {
      setReaderSettings(JSON.parse(saved));
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setReaderSettings(prev => ({
        ...prev,
        theme: prefersDark ? 'bg-[#0a0a0a] text-gray-400' : 'bg-[#fdfdfd] text-gray-800'
      }));
    }

    async function getFullData() {
      if (!bolumId || !id) return;
      try {
        
        const { data: chapter } = await supabase.from('chapters').select('*').eq('id', bolumId).single();
        const { data: book } = await supabase.from('books').select('*').eq('id', id).single();
        const { data: all } = await supabase.from('chapters').select('id, title').eq('book_id', id).order('order_no', { ascending: true });
        
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          await supabase.rpc('increment_view_count', {
            p_chapter_id: Number(bolumId),
            p_user_id: currentUser.id
          });

          await supabase.from('reading_history').upsert({
            user_email: currentUser.email,
            book_id: Number(id),
            chapter_id: Number(bolumId),
            updated_at: new Date()
          }, { onConflict: 'user_email, book_id' });

          const { data: vote } = await supabase
            .from('chapter_votes')
            .select('*')
            .eq('chapter_id', bolumId)
            .eq('user_email', currentUser.email)
            .single();
          
          setHasLiked(!!vote);
        }

        const { count: likeCount } = await supabase
          .from('chapter_votes')
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', bolumId);
        
        setLikes(likeCount || 0);

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

const handleLike = async () => {
  if (!user) return toast.error("Beğenmek için giriş yapmalısın.");

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();
  
  const username = profile?.username || user.email.split('@')[0];

  if (hasLiked) {
    const { error } = await supabase
      .from('chapter_votes')
      .delete()
      .eq('chapter_id', bolumId)
      .eq('user_email', user.email);
    
    if (!error) {
      setLikes(prev => prev - 1);
      setHasLiked(false);
    }
  } else {
    const { error } = await supabase
      .from('chapter_votes')
      .insert({
        chapter_id: bolumId,
        user_email: user.email
      });
    
    if (!error) {
      setLikes(prev => prev + 1);
      setHasLiked(true);
      toast.success("Bölüm beğenildi ❤️");
      
      await createChapterVoteNotification(username, user.email, id, bolumId);
    }
  }
};

  const handleCommentAdded = (pId) => {
    if (pId !== null) {
      setParaCommentCounts(prev => ({ ...prev, [pId]: (prev[pId] || 0) + 1 }));
    }
  };

  const updateSettings = (newSettings) => {
    const updated = { ...readerSettings, ...newSettings };
    setReaderSettings(updated);
    localStorage.setItem('yazio_reader_settings', JSON.stringify(updated));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black opacity-10 animate-pulse text-5xl italic uppercase tracking-tighter">YUKLENIYOR</div>;
  
  const currentIndex = data.allChapters.findIndex(c => Number(c.id) === Number(bolumId));
  const prevChapter = currentIndex > 0 ? data.allChapters[currentIndex - 1] : null;
  const nextChapter = (currentIndex !== -1 && currentIndex < data.allChapters.length - 1) ? data.allChapters[currentIndex + 1] : null;
  
  // ✅ Hem HTML hem düz metin destekli paragraf ayrıştırma
  const paragraphs = data.chapter?.content 
    ? (() => {
        const content = data.chapter.content;
        
        // HTML içeriyor mu kontrol et
        const hasHTML = /<br|<p|<\/p/i.test(content);
        
        if (hasHTML) {
          // Yeni bölümler: HTML ile ayrıştır
          return content
            .split(/<br\s*\/?>|<\/p>/)
            .map(p => {
              let cleaned = p.replace(/<p[^>]*>/g, '').trim();
              cleaned = cleaned.replace(/\s*style=""\s*/g, '');
              return cleaned;
            })
            .filter(p => p !== '' && p !== '<br>' && p !== '<br/>');
        } else {
          // Eski bölümler: \n\n ile ayrıştır
          return content
            .split(/\n\n+/)
            .map(p => p.trim())
            .filter(p => p !== '');
        }
      })()
    : [];

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#080808]">
      <Toaster />
      
      <nav className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[85%] max-w-2xl h-11 bg-white/60 dark:bg-black/60 backdrop-blur-3xl border dark:border-white/5 rounded-full flex items-center justify-between px-6 shadow-sm">
        <Link href={`/kitap/${id}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-all">
          ← Geri
        </Link>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600">AYARLAR</button>
      </nav>

      {isSettingsOpen && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[60] w-[85%] max-w-md bg-white dark:bg-gray-900 border dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-200">
          <div className="flex justify-between items-center mb-8"><span className="text-[9px] font-black uppercase tracking-widest opacity-40">Okuma Ayarları</span><button onClick={() => setIsSettingsOpen(false)}>✕</button></div>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between mb-4"><span className="text-[10px] font-bold uppercase tracking-widest">Boyut</span><span className="text-[10px] font-black">{readerSettings.fontSize}px</span></div>
              <input type="range" min="14" max="32" value={readerSettings.fontSize} onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })} className="w-full h-1 bg-gray-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => updateSettings({ theme: 'bg-[#fdfdfd] text-gray-800' })} className="flex-1 h-10 rounded-xl bg-[#fdfdfd] border text-[9px] font-black uppercase">Light</button>
              <button onClick={() => updateSettings({ theme: 'bg-[#f4ecd8] text-[#5b4636]' })} className="flex-1 h-10 rounded-xl bg-[#f4ecd8] border text-[9px] font-black uppercase">Sepya</button>
              <button onClick={() => updateSettings({ theme: 'bg-[#0a0a0a] text-gray-400' })} className="flex-1 h-10 rounded-xl bg-[#0a0a0a] border text-[9px] font-black uppercase">Dark</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center min-h-screen relative">
        {/* ✅ OKUMA ALANI */}
        <main className={`w-full max-w-2xl pt-48 pb-20 px-6 md:px-8 shrink-0 transition-colors duration-500 ${readerSettings.theme}`}>
          <header className="mb-24 text-center">
            <h1 className={`text-3xl md:text-5xl ${readerSettings.fontFamily} tracking-tight mb-4`}>{data.chapter?.title}</h1>
          </header>
          
          {/* ✅ PARAGRAFLAR - Mobilde buton inline, PC'de sağda */}
          <article className={`${readerSettings.fontFamily} leading-[2.1]`} style={{ fontSize: `${readerSettings.fontSize}px` }}>
            {paragraphs.map((para, i) => {
              const paraId = i.toString();
              const count = paraCommentCounts[paraId] || 0;
              
              return (
                <div key={i} className="relative group mb-3">
                  {/* ✅ PC: Yan yana, Mobil: Inline son kelime yanında */}
                  <div className="flex items-start justify-between gap-2 md:gap-2">
                    {/* ✅ Paragraf */}
                    <div 
                      className={`flex-1 transition-all duration-500 ${activePara === paraId ? 'bg-black/5 dark:bg-white/5 rounded-2xl px-3 py-2' : ''}`}
                      dangerouslySetInnerHTML={{ __html: para }}
                      style={{ whiteSpace: 'pre-wrap' }}
                    />
                    
                    {/* ✅ Yorum butonu - Çok küçük yuvarlak */}
                    <button 
                      onClick={() => setActivePara(activePara === paraId ? null : paraId)} 
                      className={`shrink-0 w-3 h-3 md:w-5 md:h-5 flex items-center justify-center rounded-full transition-all border text-[5px] md:text-[7px] font-black mt-0.5 md:mt-1 ${
                        count > 0 || activePara === paraId 
                          ? 'bg-red-600 border-red-600 text-white shadow-lg' 
                          : readerSettings.theme.includes('bg-[#f4ecd8]')
                            ? 'bg-[#e8d9c3] border-[#d4c4a8] text-[#8b7355] hover:bg-red-600 hover:border-red-600 hover:text-white'
                            : readerSettings.theme.includes('bg-[#0a0a0a]')
                              ? 'bg-white/10 border-white/20 text-gray-400 hover:bg-red-600 hover:border-red-600 hover:text-white'
                              : 'bg-gray-200 border-gray-300 text-gray-500 hover:bg-red-600 hover:border-red-600 hover:text-white'
                      }`}
                    >
                      {count > 0 ? count : '+'}
                    </button>
                  </div>
                </div>
              );
            })}
          </article>

          {/* ✅ NAVİGASYON BUTONLARI - Az boşluk üstte */}
          <div className="mt-16 flex items-center justify-between gap-6 border-t border-current/10 pt-8">
            {prevChapter ? (
              <Link href={`/kitap/${id}/bolum/${prevChapter.id}`} className="flex-1 h-11 flex items-center justify-center rounded-full bg-current/5 text-[9px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-current/10 transition-all">
                ← Önceki
              </Link>
            ) : <div className="flex-1" />}

            {nextChapter ? (
              <Link href={`/kitap/${id}/bolum/${nextChapter.id}`} className="flex-1 h-11 flex items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all">
                Sonraki →
              </Link>
            ) : (
              <div className="flex-1 h-11 flex items-center justify-center rounded-full border border-current/10 text-[9px] font-black uppercase opacity-20 text-center">
                Eserin Sonu
              </div>
            )}
          </div>
        </main>

        {/* ✅ PARAGRAF YORUM PANELİ - Mobilde tam ekran küçük, PC'de sağda sabit */}
        <aside className={`fixed inset-0 md:inset-auto md:top-24 md:right-8 md:bottom-8 md:w-[280px] transition-all duration-500 z-50 ${
          activePara !== null ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full md:translate-x-12 pointer-events-none'
        }`}>
          {/* ✅ Mobilde backdrop - tıklayınca kapansın */}
          <div 
            className="absolute inset-0 bg-black/50 md:hidden"
            onClick={() => setActivePara(null)}
          />
          
          <div className="absolute inset-4 md:inset-0 h-[calc(100%-2rem)] md:h-full bg-white dark:bg-[#0f0f0f] md:border dark:border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b dark:border-white/5 flex justify-between items-center font-black text-[8px] uppercase opacity-40 tracking-widest">
              Paragraf Yorumları
              <button onClick={() => setActivePara(null)} className="text-gray-400 hover:text-red-600 text-xl md:text-lg">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <YorumAlani 
                type="paragraph" 
                targetId={bolumId} 
                bookId={id} 
                paraId={activePara} 
                onCommentAdded={handleCommentAdded} 
              />
            </div>
          </div>
        </aside>
      </div>

      {/* ✅ BÖLÜM YORUMLARI - Az boşluk üstte */}
      <section className="bg-[#fcfcfc] dark:bg-[#080808] pt-12 pb-20">
        <div className="max-w-2xl mx-auto px-6 md:px-8">
          <div className="p-8 border-4 border-red-600 rounded-3xl bg-white/50 dark:bg-black/30">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black flex items-center justify-center gap-3 dark:text-white">
                <span className="text-red-600">📖</span> 
                Bölüm Yorumları
              </h2>
              
              <div className="flex justify-center mt-6">
                <button 
                  onClick={handleLike}
                  className={`flex items-center gap-3 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 ${
                    hasLiked 
                      ? 'bg-red-600 text-white shadow-red-600/30' 
                      : 'bg-white dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-red-600'
                  }`}
                >
                  <span className="text-xl">{hasLiked ? '❤️' : '🤍'}</span>
                  <span>{hasLiked ? 'Beğendin' : 'Bölümü Beğen'} • {likes}</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 uppercase tracking-widest">
                Bu bölüm hakkında ne düşündünüz?
              </p>
            </div>
            
            {bolumId && id ? (
              <YorumAlani 
                type="chapter" 
                targetId={bolumId} 
                bookId={id} 
                paraId={null}
                onCommentAdded={handleCommentAdded}
                includeParagraphs={true}
              />
            ) : (
              <p className="text-center text-red-500">ID'ler yüklenemedi</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}