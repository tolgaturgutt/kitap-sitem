'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function BookReader({ content, bookId, chapterId }) {
  const [comments, setComments] = useState([]);
  const [activeParagraph, setActiveParagraph] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);

  const paragraflar = content ? content.split('\n').filter(p => p.trim() !== '') : [];

  useEffect(() => {
    // OKUNMA SAYISI FIX: Bileşen yüklendiğinde sayıyı artır
    if (chapterId) {
      supabase.rpc('increment_views', { target_chapter_id: chapterId });
    }

    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    supabase.from('comments').select('*').eq('chapter_id', chapterId).then(({ data }) => setComments(data || []));
  }, [chapterId]);

  async function handleSend() {
    if (!newComment.trim() || !user) return;
    const { data, error } = await supabase.from('comments').insert([{ 
      content: newComment, 
      book_id: bookId, 
      chapter_id: chapterId, 
      paragraph_id: activeParagraph, 
      user_email: user.email, 
      username: user.user_metadata?.username || user.email.split('@')[0] 
    }]).select().single();
    
    if (!error) { 
      setComments([...comments, data]); 
      setNewComment(''); 
      toast.success('Yorum eklendi.'); 
    }
  }

  return (
    <div className="relative">
      <div className="prose prose-lg dark:prose-invert max-w-none">
        {paragraflar.map((p, i) => {
          const count = comments.filter(c => c.paragraph_id === i).length;
          return (
            <div key={i} className="group relative mb-8">
              <p className="text-xl md:text-2xl leading-[1.8] text-gray-800 dark:text-gray-200 font-serif antialiased">{p}</p>
              
              {/* YORUM SAYISI FIX: count > 0 ise her zaman görünür yapıldı */}
              <button 
                onClick={() => setActiveParagraph(i)} 
                className={`absolute -right-12 top-0 h-full w-10 flex items-start justify-center pt-2 transition-all 
                  ${count > 0 || activeParagraph === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <div className={`p-2 rounded-full relative shadow-sm border transition-all
                  ${count > 0 || activeParagraph === i 
                    ? 'bg-red-600 border-red-600 text-white' 
                    : 'bg-gray-50 dark:bg-gray-900 dark:border-gray-800'
                  }`}
                >
                  <span className="text-sm">💬</span>
                  {count > 0 && (
                    <span className={`absolute -top-1 -right-1 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center
                      ${activeParagraph === i ? 'bg-white text-red-600' : 'bg-red-600 text-white shadow-lg'}`}
                    >
                      {count}
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {activeParagraph !== null && (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-[#0a0a0a] shadow-2xl z-[100] flex flex-col p-6 animate-slide-in border-l dark:border-white/5">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-black text-xs uppercase tracking-widest dark:text-white italic">Paragraf Yorumları</h3>
            <button onClick={() => setActiveParagraph(null)} className="text-gray-400 hover:text-red-600 transition-colors text-2xl">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-6 mb-6 no-scrollbar">
            {comments.filter(c => c.paragraph_id === activeParagraph).length === 0 ? (
              <p className="text-center py-20 text-[10px] text-gray-400 uppercase tracking-widest italic">Henüz yorum yok, ilk sen yaz.</p>
            ) : (
              comments.filter(c => c.paragraph_id === activeParagraph).map(c => (
                <div key={c.id} className="border-b dark:border-white/5 pb-4">
                  <span className="font-black text-[10px] uppercase text-red-600 tracking-tighter">@{c.username}</span>
                  <p className="text-sm text-gray-700 dark:text-gray-400 mt-1 leading-relaxed">{c.content}</p>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-auto">
            <textarea 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)} 
              placeholder="Fikrini paylaş..." 
              className="w-full p-4 bg-gray-50 dark:bg-white/5 border dark:border-white/10 rounded-2xl text-sm mb-4 outline-none focus:ring-1 focus:ring-red-600 transition-all dark:text-white no-scrollbar" 
              rows="3" 
            />
            <button onClick={handleSend} className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all shadow-xl">
              Yorumu Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}