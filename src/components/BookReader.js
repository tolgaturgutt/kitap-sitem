'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// İkonlar
const Icons = {
  Comment: () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.562 2.632 6.19l-.368 1.454a3.75 3.75 0 0 0 2.287 4.65c.343.088.7.13 1.053.13Z" clipRule="evenodd" /></svg>),
  Close: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>),
  Trash: () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 0 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>),
  Flag: () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 4.271.572 7.948 7.948 0 0 0 5.965.524l2.078-.64A.75.75 0 0 0 18 12.25v-8.5a.75.75 0 0 0-.904-.734l-2.38.501a7.25 7.25 0 0 1-4.186-.363l-.502-.2a8.75 8.75 0 0 0-5.053-.439l-1.475.31V2.75Z" /></svg>)
};

export default function BookReader({ content, bookId, chapterId }) {
  const [comments, setComments] = useState([]);
  const [activeParagraph, setActiveParagraph] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Hem HTML hem düz metin destekli
  const paragraflar = content 
    ? (() => {
        const hasHTML = /<br|<p|<\/p/i.test(content);
        
        if (hasHTML) {
          return content
            .split(/<\/p>|<br\s*\/?>/)
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

  useEffect(() => {
    if (chapterId) {
      supabase.rpc('increment_views', { target_chapter_id: chapterId });
      loadComments();
    }
    checkUserAndAdmin();
  }, [chapterId]);

  async function checkUserAndAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const { data } = await supabase
        .from('announcement_admins')
        .select('*')
        .eq('user_email', user.email)
        .single();
      if (data) setIsAdmin(true);
    }
  }

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: true });
    
    setComments(data || []);
  }

  async function handleSend() {
    if (!newComment.trim() || !user) return;
    const { data, error } = await supabase.from('comments').insert([{ 
      content: newComment, 
      book_id: bookId, 
      chapter_id: chapterId, 
      paragraph_id: activeParagraph, 
      user_email: user.email, 
      user_id: user.id 
    }]).select('*, profiles(username, avatar_url)').single();
    
    if (!error) { 
      setComments([...comments, data]); 
      setNewComment(''); 
      toast.success('Yorum eklendi.'); 
    } else {
      toast.error('Yorum gönderilemedi.');
    }
  }

  async function handleReport(commentId, content) {
    const reason = prompt("Şikayet sebebi?");
    if (!reason) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'comment',
      target_id: commentId,
      reason: reason,
      content_snapshot: content
    });
    if (error) toast.error("Hata oluştu.");
    else toast.success("Şikayet iletildi.");
  }

  async function handleDelete(commentId) {
    if(!confirm("Bu yorumu silmek istiyor musun?")) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success("Yorum silindi.");
    }
  }

  return (
    <div className="relative">
      <div className="prose prose-lg dark:prose-invert max-w-none">
        {paragraflar.map((p, i) => {
          const count = comments.filter(c => c.paragraph_id === i).length;
          return (
            <div key={i} className="group relative mb-3 flex items-start justify-between gap-2">
              {/* ✅ HTML render için dangerouslySetInnerHTML */}
              <div 
                className="flex-1 text-xl md:text-2xl leading-[1.8] text-gray-800 dark:text-gray-200 font-serif antialiased"
                dangerouslySetInnerHTML={{ __html: p }}
              />
              {/* ✅ ALLAH RAZI OLSUN ÇOK MİNİK BUTON - mobilde 6px! */}
              <button 
                onClick={() => setActiveParagraph(i)} 
                className={`shrink-0 w-[6px] h-[6px] md:w-4 md:h-4 flex items-center justify-center rounded-full transition-all border-[0.5px] md:border text-[4px] md:text-[6px] font-black mt-0.5 md:mt-1
                  ${count > 0 || activeParagraph === i 
                    ? 'bg-red-600 border-red-600 text-white shadow-lg' 
                    : 'bg-gray-200 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:bg-red-600 hover:border-red-600 hover:text-white'
                  }`}
              >
                {count > 0 ? <span className="hidden md:inline">{count}</span> : <span className="hidden md:inline">+</span>}
              </button>
            </div>
          );
        })}
      </div>

      {activeParagraph !== null && (
        <>
          {/* ✅ Mobilde backdrop - tıklayınca kapansın */}
          <div className="fixed inset-0 bg-black/50 md:bg-black/20 backdrop-blur-[1px] z-[90]" onClick={() => setActiveParagraph(null)} />
          <div className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto w-full md:w-96 bg-white dark:bg-[#0a0a0a] shadow-2xl z-[100] flex flex-col animate-slide-in border-l dark:border-white/5">
            <div className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
              <h3 className="font-black text-xs uppercase tracking-widest dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                Paragraf Yorumları
              </h3>
              <button onClick={() => setActiveParagraph(null)} className="text-gray-400 hover:text-red-600 transition-colors"><Icons.Close /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {comments.filter(c => c.paragraph_id === activeParagraph).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50"><Icons.Comment /><p className="text-[10px] uppercase tracking-widest mt-4">İlk yorumu sen yaz</p></div>
              ) : (
                comments.filter(c => c.paragraph_id === activeParagraph).map(c => (
                  <div key={c.id} className="group relative flex gap-3 animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden">
                       {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar"/> : (c.profiles?.username || c.user_email || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-[10px] uppercase text-gray-900 dark:text-white tracking-tight">@{c.profiles?.username || 'Anonim'}</span>
                        
                        {user && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(user.id === c.user_id || isAdmin) ? (
                              <button onClick={() => handleDelete(c.id)} title="Sil" className="text-gray-300 hover:text-red-500 transition-colors"><Icons.Trash /></button>
                            ) : (
                              <button onClick={() => handleReport(c.id, c.content)} title="Raporla" className="text-gray-300 hover:text-yellow-500 transition-colors"><Icons.Flag /></button>
                            )}
                          </div>
                        )}

                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-snug">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-black border-t dark:border-white/10">
              <div className="relative">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={user ? "Bu paragraf hakkında ne düşünüyorsun?" : "Giriş yapmalısın."} disabled={!user} className="w-full p-4 pr-12 bg-white dark:bg-white/5 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-red-600/20 transition-all dark:text-white resize-none shadow-sm" rows="2" />
                <button onClick={handleSend} disabled={!user || !newComment.trim()} className="absolute right-2 bottom-2 p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" /></svg></button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}