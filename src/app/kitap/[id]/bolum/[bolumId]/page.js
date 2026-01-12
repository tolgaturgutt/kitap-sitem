'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import YorumAlani from '@/components/YorumAlani';
import { Toaster, toast } from 'react-hot-toast';
import { createChapterVoteNotification } from '@/lib/notifications';
import Username from '@/components/Username';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation'; // 👈 1. BUNU EKLE

export default function BolumDetay({ params }) {
  const decodedParams = use(params);
  const id = decodedParams.id;
  const bolumId = decodedParams.bolumId;

  const [data, setData] = useState({ book: null, chapter: null, allChapters: [] });
  const [loading, setLoading] = useState(true);
  const [activePara, setActivePara] = useState(null);
  const [paraCommentCounts, setParaCommentCounts] = useState({});
  const [user, setUser] = useState(null);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [readerSettings, setReaderSettings] = useState({
    fontSize: 20,
    fontFamily: 'font-serif',
    theme: 'bg-[#fdfdfd] text-gray-800'
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const searchParams = useSearchParams(); // 👈 2. BUNU EKLE

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
        const { data: chapter, error: chapterError } = await supabase.from('chapters').select('*').eq('id', bolumId).single();

        if (chapterError || !chapter) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        
        const { data: book } = await supabase.from('books').select('*').eq('id', id).single();
        const { data: all } = await supabase.from('chapters').select('id, title, is_draft').eq('book_id', id).order('order_no', { ascending: true });

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        const isAuthor = currentUser && book?.user_email === currentUser.email;
        
        let isUserAdmin = false;
        if (currentUser) {
          const { data: adminCheck } = await supabase
            .from('announcement_admins')
            .select('user_email')
            .eq('user_email', currentUser.email)
            .single();
          isUserAdmin = !!adminCheck;
        }

        if (chapter?.is_draft && !isAuthor && !isUserAdmin) {
          window.location.href = '/';
          return;
        }

        if (book?.is_draft && !isAuthor && !isUserAdmin) {
          window.location.href = '/';
          return;
        }

        if (book?.user_email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, email')
            .eq('email', book.user_email)
            .single();

          setAuthorProfile(profile);

          const { data: adminData } = await supabase
            .from('announcement_admins')
            .select('user_email')
            .eq('user_email', book.user_email)
            .single();

          setIsAdmin(!!adminData);
        }

        if (currentUser) {
          const viewKey = `viewed_chapter_${bolumId}_${currentUser.id}`;
          const hasViewed = localStorage.getItem(viewKey);

        if (!hasViewed) {
            // 🛑 KİLİDİ ÖNCE VURUYORUZ!
            // Kod daha veritabanına gitmeden "Bu okundu" diye işaretliyoruz.
            // Böylece ikinci istek gelirse "Zaten okunmuş" deyip iptal ediyor.
            localStorage.setItem(viewKey, 'true');

            await supabase.rpc('increment_view_count', {
              p_chapter_id: Number(bolumId),
              p_user_id: currentUser.id
            });
          }
          const { error: historyError } = await supabase.from('reading_history').upsert({
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'a' || e.key === 'A'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // 👇 3. BU YENİ useEffect'İ EKLE
  useEffect(() => {
    if (loading || !data.chapter) return;

    const openPara = searchParams.get('openPara');
    const scrollTo = searchParams.get('scrollTo');
    const commentId = searchParams.get('commentId');

    const timer = setTimeout(() => {
      if (openPara !== null) {
        setActivePara(openPara);
        
        setTimeout(() => {
          const paraElement = document.querySelector(`[data-para-id="${openPara}"]`);
          if (paraElement) {
            paraElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        if (commentId) {
          let attempts = 0;
          const checkInterval = setInterval(() => {
            attempts++;
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            
            if (commentElement) {
              clearInterval(checkInterval);
              
              const scrollContainer = commentElement.closest('.overflow-y-auto');
              if (scrollContainer) {
                const elementTop = commentElement.offsetTop;
                scrollContainer.scrollTo({
                  top: elementTop - 100,
                  behavior: 'smooth'
                });
              }
              commentElement.classList.add('highlight-comment');
              setTimeout(() => {
                commentElement.classList.remove('highlight-comment');
              }, 3000);
            } else if (attempts >= 15) {
              clearInterval(checkInterval);
            }
          }, 400);
        }
      } else if (scrollTo === 'chapter-comments') {
        const commentsSection = document.getElementById('chapter-comments-section');
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        if (commentId) {
          setTimeout(() => {
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
              commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              commentElement.classList.add('highlight-comment');
              setTimeout(() => {
                commentElement.classList.remove('highlight-comment');
              }, 3000);
            }
          }, 500);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [loading, data.chapter, searchParams]);
  // 👆 3. BURAYA KADAR EKLE

  const handleLike = async () => {
    if (!user) return toast.error("Beğenmek için giriş yapmalısın.");
    if (!user.email_confirmed_at) {
       return toast.error("Oy vermek için lütfen email adresinizi onaylayın.");
    }

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

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfcfc] dark:bg-[#080808] px-6 text-center">
        <div className="text-8xl mb-6 animate-bounce select-none">
          👻
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
          Bölüm Uçmuş!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md text-sm md:text-base font-medium">
          Aradığın bu bölüm yazar tarafından silinmiş veya yayından kaldırılmış olabilir.
        </p>
        
        <div className="flex gap-4">
           <Link 
             href={`/kitap/${id}`} 
             className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-xl shadow-red-600/20 text-xs uppercase tracking-widest"
           >
             Kitaba Dön
           </Link>
           
           <Link 
             href="/"
             className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold py-4 px-8 rounded-2xl transition-all text-xs uppercase tracking-widest"
           >
             Ana Sayfa
           </Link>
        </div>
      </div>
    );
  }

  const currentIndex = data.allChapters.findIndex(c => Number(c.id) === Number(bolumId));
  
  const isAuthor = user && data.book?.user_email === user.email;
  const visibleChapters = (isAuthor || isAdmin) 
    ? data.allChapters 
    : data.allChapters.filter(c => !c.is_draft);
  
  const visibleIndex = visibleChapters.findIndex(c => Number(c.id) === Number(bolumId));
  const prevChapter = visibleIndex > 0 ? visibleChapters[visibleIndex - 1] : null;
  const nextChapter = (visibleIndex !== -1 && visibleIndex < visibleChapters.length - 1) ? visibleChapters[visibleIndex + 1] : null;

  const paragraphs = data.chapter?.content
    ? (() => {
      const content = data.chapter.content;
      const hasHTML = /<br|<p|<\/p/i.test(content);

      if (hasHTML) {
        return content
          .split(/<br\s*\/?>|<\/p>/)
          .map(p => {
            let cleaned = p.replace(/<p[^>]*>/g, '').trim();
            cleaned = cleaned.replace(/\s*style=""\s*/g, '');
            return cleaned;
          })
          .filter(p => p !== '' && p !== '<br>' && p !== '<br/>');
      } else {
        return content
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p !== '');
      }
    })()
    : [];

  const authorLink = user && authorProfile?.email === user.email
    ? '/profil'
    : `/yazar/${authorProfile?.username || data.book?.username}`;

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
        <main className={`w-full max-w-2xl pt-48 pb-20 px-6 md:px-8 shrink-0 transition-colors duration-500 ${readerSettings.theme}`}>
          <header 
            className="mb-24 text-center select-none"
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <h1 className={`text-3xl md:text-5xl ${readerSettings.fontFamily} tracking-tight mb-4`}>{data.chapter?.title}</h1>
          </header>

          <article 
            className={`${readerSettings.fontFamily} leading-[2.1] select-none`} 
            style={{ fontSize: `${readerSettings.fontSize}px` }}
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {paragraphs.map((para, i) => {
              const paraId = i.toString();
              const count = paraCommentCounts[paraId] || 0;

              return (
                <div key={i} className="relative group mb-4 isolate" data-para-id={paraId}>
                  <div className="relative">
                    <div
                      className={`
                        transition-all duration-500
                        pr-0 md:pr-7
                        ${activePara === paraId ? 'bg-black/5 dark:bg-white/5 rounded-2xl px-3 py-2 -ml-3' : ''}
                      `}
                      dangerouslySetInnerHTML={{ __html: para }}
                    />

                    <div
                      onClick={() => setActivePara(activePara === paraId ? null : paraId)}
                      className={`
                        absolute right-[-12px] top-1/2 -translate-y-1/2
                        w-[15px] h-[15px] md:w-[25px] md:h-[25px]
                        rounded-full bg-gray-400 opacity-40
                        z-10 cursor-pointer
                        transition-all
                        group-hover:w-4 group-hover:h-4
                        group-hover:bg-red-600 group-hover:opacity-100
                        ${count > 0 || activePara === paraId ? 'w-4 h-4 bg-red-600 opacity-100' : ''}
                      `}
                    >
                      {(count > 0 || activePara === paraId) && (
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white scale-[0.7]">
                          {count > 0 ? count : '+'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </article>

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

          {authorProfile && (
            <Link
              href={authorLink}
              className="mt-8 flex items-center gap-4 p-5 rounded-2xl bg-current/5 hover:bg-current/10 transition-all group border border-current/10"
            >
              <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 ${readerSettings.theme.includes('bg-[#f4ecd8]')
                ? 'bg-[#e8d9c3]'
                : readerSettings.theme.includes('bg-[#0a0a0a]')
                  ? 'bg-white/10'
                  : 'bg-gray-200'
                }`}>
                {authorProfile.avatar_url ? (
                  <img src={authorProfile.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center font-black text-lg ${readerSettings.theme.includes('bg-[#f4ecd8]')
                    ? 'text-[#8b7355]'
                    : readerSettings.theme.includes('bg-[#0a0a0a]')
                      ? 'text-gray-400'
                      : 'text-gray-600'
                    }`}>
                    {authorProfile.username?.[0]?.toUpperCase() || 'Y'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${readerSettings.theme.includes('bg-[#f4ecd8]')
                  ? 'text-[#8b7355] opacity-60'
                  : readerSettings.theme.includes('bg-[#0a0a0a]')
                    ? 'text-gray-500'
                    : 'text-gray-400'
                  }`}>
                  Yazar
                </p>
                <div className="text-sm font-bold group-hover:text-red-600 transition-colors">
                  <Username
                    username={authorProfile.username || data.book?.username}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
              <div className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </div>
            </Link>
          )}
        </main>

        <aside className={`fixed inset-0 md:inset-auto md:top-24 md:right-8 md:bottom-8 md:w-[400px] transition-all duration-500 z-[60] ${activePara !== null ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full md:translate-x-12 pointer-events-none'
          }`}>
          <div
            className="absolute inset-0 bg-black/50 md:hidden"
            onClick={() => setActivePara(null)}
          />

          <div className="absolute left-4 right-4 top-16 bottom-4 md:inset-0 bg-white dark:bg-[#0f0f0f] md:border dark:border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            
            <div className="shrink-0 p-4 border-b dark:border-white/5 flex justify-between items-center font-black text-[8px] uppercase tracking-widest bg-white dark:bg-[#0f0f0f] z-50 relative rounded-t-[2rem]">
              <span className="opacity-40">Paragraf Yorumları</span>
              
              <button 
                onClick={() => setActivePara(null)} 
                className="text-black dark:text-white hover:text-red-600 text-xl font-bold p-4 -mr-4 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-hidden relative bg-gray-50 dark:bg-black/20">
              <YorumAlani
                key={`paragraph-${activePara}`} // 🔥 Key ekle - paraId değişince yeniden mount olsun
                type="paragraph"
                targetId={bolumId}
                bookId={id}
                paraId={activePara}
                onCommentAdded={handleCommentAdded}
                onStatsUpdate={(newStats) => {
                  console.log('Kitap stats güncellendi (paragraf):', newStats);
                }}
              />
            </div>
          </div>
        </aside>
      </div>

      <section id="chapter-comments-section" className="bg-[#fcfcfc] dark:bg-[#080808] pt-12 pb-20">
        <div className="max-w-2xl mx-auto px-6 md:px-8">
          <div className="p-8 border-4 border-red-600 rounded-3xl bg-white/50 dark:bg-black/30">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black flex items-center justify-center gap-3 dark:text-white">
                <span className="text-red-600">📖</span>
                Bölüm Yorumları
              </h2>

              <div className="flex justify-center gap-3 mt-6 flex-wrap">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-3 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 ${hasLiked
                    ? 'bg-red-600 text-white shadow-red-600/30'
                    : 'bg-white dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-red-600'
                    }`}
                >
                  <span className="text-xl">{hasLiked ? '❤️' : '🤍'}</span>
                  <span>{hasLiked ? 'Beğendin' : 'Bölümü Beğen'} • {likes}</span>
                </button>

                {user && (
                  <button
                    onClick={async () => {
                      const reason = prompt("Şikayet sebebiniz nedir?");
                      if (!reason) return;
                      
                      const { error } = await supabase.from('reports').insert({
                        reporter_id: user.id,
                        target_type: 'chapter',
                        target_id: bolumId,
                        reason: reason,
                        content_snapshot: `${data.book?.title} - ${data.chapter?.title}`
                      });
                      
                      if (!error) {
                        toast.success("Bölüm raporlandı.");
                      } else {
                        toast.error("Hata oluştu.");
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-red-600 transition-all hover:scale-105"
                  >
                    <span>🚨</span>
                    <span>Rapor Et</span>
                  </button>
                )}
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
                onStatsUpdate={(newStats) => {
                  console.log('Kitap stats güncellendi (bölüm):', newStats);
                }}
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