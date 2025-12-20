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
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    supabase.from('comments').select('*').eq('chapter_id', chapterId).then(({ data }) => setComments(data || []));
  }, [chapterId]);

  async function handleSend() {
    if (!newComment.trim() || !user) return;
    const { data, error } = await supabase.from('comments').insert([{ content: newComment, book_id: bookId, chapter_id: chapterId, paragraph_id: activeParagraph, user_email: user.email, username: user.user_metadata?.username || user.email.split('@')[0] }]).select().single();
    if (!error) { setComments([...comments, data]); setNewComment(''); toast.success('Yorum eklendi.'); }
  }

  return (
    <div className="relative">
      <div className="prose prose-lg dark:prose-invert max-w-none">
        {paragraflar.map((p, i) => {
          const count = comments.filter(c => c.paragraph_id === i).length;
          return (
            <div key={i} className="group relative mb-8">
              <p className="text-xl md:text-2xl leading-[1.8] text-gray-800 dark:text-gray-200 font-serif antialiased">{p}</p>
              <button onClick={() => setActiveParagraph(i)} className={`absolute -right-12 top-0 h-full w-10 flex items-start justify-center pt-2 transition-all ${count > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-800 p-2 rounded-full relative shadow-sm">
                  <span className="text-sm">💬</span>
                  {count > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{count}</span>}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {activeParagraph !== null && (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-[#0a0a0a] shadow-2xl z-[100] flex flex-col p-6 animate-slide-in">
          <div className="flex justify-between items-center mb-10"><h3 className="font-black text-xs uppercase tracking-widest dark:text-white">Yorumlar</h3><button onClick={() => setActiveParagraph(null)} className="text-gray-400 text-2xl">✕</button></div>
          <div className="flex-1 overflow-y-auto space-y-6 mb-6">
            {comments.filter(c => c.paragraph_id === activeParagraph).map(c => (
              <div key={c.id} className="border-b dark:border-gray-900 pb-4">
                <span className="font-black text-[10px] uppercase text-red-600">@{c.username}</span>
                <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">{c.content}</p>
              </div>
            ))}
          </div>
          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Fikrini paylaş..." className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-gray-800 rounded-xl text-sm mb-4 outline-none focus:border-red-600 dark:text-white" rows="3" />
          <button onClick={handleSend} className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition">Gönder</button>
        </div>
      )}
    </div>
  );
}