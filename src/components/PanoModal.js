'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Username from '@/components/Username';

export default function PanoModal({ 
  selectedPano, 
  onClose, 
  user, 
  adminEmails = [],
  isAdmin = false,
  isOwner = false,
  onDelete = null 
}) {
  const [panoLikes, setPanoLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [panoComments, setPanoComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  // --- 1. VERİLERİ YÜKLE ---
  useEffect(() => {
    if (!selectedPano) return;

    // ✅ KRİTİK DÜZELTME: Pano değiştiği an eski verileri temizle/sıfırla.
    // Böylece yeni veriler yüklenene kadar eskiler görünüp kafa karıştırmaz.
    setPanoLikes(0);
    setHasLiked(false);
    setPanoComments([]);

    async function loadPanoData() {
      // Beğeni sayısı
      const { count } = await supabase
        .from('pano_votes')
        .select('*', { count: 'exact', head: true })
        .eq('pano_id', selectedPano.id);
      
      setPanoLikes(count || 0);

      // Kullanıcı beğenmiş mi?
      if (user) {
        const { data } = await supabase
          .from('pano_votes')
          .select('*')
          .eq('pano_id', selectedPano.id)
          .eq('user_email', user.email)
          .single();
        
        setHasLiked(!!data);
      }

      // Yorumları çek
      const { data: comments } = await supabase
        .from('pano_comments')
        .select('*')
        .eq('pano_id', selectedPano.id)
        .order('created_at', { ascending: true });

      // Profilleri eşleştir
      if (comments && comments.length > 0) {
        const commentsWithProfiles = await Promise.all(
          comments.map(async (comment) => {
            if (!comment.username) return comment;
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('username', comment.username)
              .single();
            return { ...comment, profiles: profile };
          })
        );
        setPanoComments(commentsWithProfiles);
      } else {
        setPanoComments([]);
      }
    }

    loadPanoData();
  }, [selectedPano, user]);

  // --- 2. FONKSİYONLAR ---
  async function handleLike() {
    if (!user) return toast.error('Giriş yapmalısın!');
    if (hasLiked) {
      await supabase.from('pano_votes').delete().eq('pano_id', selectedPano.id).eq('user_email', user.email);
      setHasLiked(false);
      setPanoLikes(prev => prev - 1);
    } else {
      await supabase.from('pano_votes').insert({ pano_id: selectedPano.id, user_email: user.email });
      setHasLiked(true);
      setPanoLikes(prev => prev + 1);
    }
  }

  async function handleComment() {
    if (!user) return toast.error('Giriş yapmalısın!');
    if (!newComment.trim()) return;

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || user.user_metadata?.username || user.email.split('@')[0];
    
    const { error } = await supabase.from('pano_comments').insert({
      pano_id: selectedPano.id,
      parent_id: replyTo,
      user_email: user.email,
      username: username,
      content: newComment
    });

    if (error) { toast.error('Hata oluştu!'); return; }

    setNewComment('');
    setReplyTo(null);

    // Listeyi güncelle
    const { data: comments } = await supabase.from('pano_comments').select('*').eq('pano_id', selectedPano.id).order('created_at', { ascending: true });
    if (comments) {
      const commentsWithProfiles = await Promise.all(
        comments.map(async (comment) => {
          if (!comment.username) return comment;
          const { data: p } = await supabase.from('profiles').select('username, avatar_url').eq('username', comment.username).single();
          return { ...comment, profiles: p };
        })
      );
      setPanoComments(commentsWithProfiles);
    }
    toast.success('Yorum eklendi!');
  }

  async function handleDeleteComment(commentId) {
    if (!confirm('Silmek istiyor musun?')) return;
    const { error } = await supabase.from('pano_comments').delete().eq('id', commentId);
    if (!error) {
      toast.success('Yorum silindi');
      setPanoComments(prev => prev.filter(c => c.id !== commentId));
    }
  }

  async function handleDeletePano(e) {
    if (e) e.stopPropagation();
    if (!window.confirm('Panoyu silmek istiyor musun?')) return;
    const { error } = await supabase.from('panolar').delete().eq('id', selectedPano.id);
    if (!error) {
      toast.success('Pano silindi!');
      if (onDelete) onDelete(selectedPano.id);
      onClose();
    }
  }

  const CommentItem = ({ comment, isReply = false }) => {
    const canDelete = isAdmin || isOwner || (user && user.email === comment.user_email);
    return (
      <div className={`flex gap-3 ${isReply ? 'ml-11' : ''}`}>
        <img
          src={comment.profiles?.avatar_url || '/avatar-placeholder.png'}
          className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover bg-gray-200`}
          alt=""
          onError={(e) => { e.target.src = '/avatar-placeholder.png' }} 
        />
        <div className="flex-1 group">
          <div className="flex items-center gap-2">
            <Link 
              href={comment.user_email === user?.email ? '/profil' : `/yazar/${comment.profiles?.username || comment.username}`}
              className="text-[10px] md:text-xs font-black hover:text-red-600 transition-colors"
            >
              <Username username={comment.profiles?.username || comment.username} isAdmin={adminEmails.includes(comment.user_email)} />
            </Link>
            {canDelete && (
              <button onClick={() => handleDeleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-gray-300 hover:text-red-600 font-bold uppercase">SİL</button>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-0.5">{comment.content}</p>
          {!isReply && (
            <button onClick={() => setReplyTo(comment.id)} className="text-[9px] text-gray-400 hover:text-red-600 font-bold mt-1 uppercase">Yanıtla</button>
          )}
        </div>
      </div>
    );
  };

  if (!selectedPano) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose}>
      {/* ✅ KRİTİK AYAR: h-[90vh] ile yüksekliği sabitledik.
         Böylece içerik ne kadar uzarsa uzasın modal ekran boyunu aşmayacak,
         sadece içindeki "overflow-y-auto" olan kısım kayacak.
      */}
      <div className="bg-white dark:bg-[#080808] w-full max-w-5xl h-[85vh] md:h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/10 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md text-xl">✕</button>

        {/* SOL TARA: GÖRSEL */}
        {selectedPano.books?.cover_url && (
          <div className="shrink-0 hidden md:flex items-center justify-center p-8 bg-gray-50 dark:bg-black/40 md:w-1/2 h-full">
            <img src={selectedPano.books.cover_url} className="shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain rounded-2xl max-h-full w-auto" alt="" />
          </div>
        )}

        {/* SAĞ TARAF: Flex yapısı ile bölündü */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#080808]">
          
          {/* 1. SCROLL ALANI (BAŞLIK + YAZI + YORUMLAR) */}
          <div className="flex-1 overflow-y-auto p-8 md:p-12">
            {/* Pano İçeriği */}
            <div className="mb-8">
              <span className="text-xs font-black text-red-600 tracking-[0.3em] uppercase mb-4 block">
                📖 {selectedPano.books?.title}
              </span>
              <h2 className="text-3xl md:text-4xl font-black mb-4 dark:text-white leading-tight">{selectedPano.title}</h2>
              <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{selectedPano.content}</p>
              
              <div className="flex items-center gap-4 mt-6 pb-6 border-b dark:border-white/5">
                <button onClick={handleLike} className={`flex items-center gap-2 px-5 py-2 rounded-full font-black text-xs transition-all ${hasLiked ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>❤️ {panoLikes}</button>
                <span className="text-xs text-gray-400">💬 {panoComments.length} yorum</span>
              </div>
            </div>

            {/* Yorumlar Listesi */}
            <div>
               <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Yorumlar</h3>
               <div className="space-y-4 pb-4">
                 {panoComments.length === 0 ? <p className="text-gray-400 text-xs italic">İlk yorumu sen yap...</p> : 
                   panoComments.filter(c => !c.parent_id).map(comment => (
                     <div key={comment.id} className="space-y-3">
                       <CommentItem comment={comment} />
                       {panoComments.filter(r => r.parent_id === comment.id).map(reply => (
                         <CommentItem key={reply.id} comment={reply} isReply={true} />
                       ))}
                     </div>
                   ))
                 }
               </div>
            </div>
          </div>

          {/* 2. SABİT FOOTER (INPUT + BUTONLAR) */}
          {/* shrink-0 sayesinde asla küçülmez ve hep altta kalır */}
          <div className="shrink-0 p-6 md:p-8 border-t dark:border-white/5 bg-white dark:bg-[#080808] z-20">
            {user && (
              <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-[2rem] border dark:border-white/5 mb-4">
                {replyTo && (
                  <div className="flex items-center justify-between px-4 py-2 border-b dark:border-white/5 mb-2">
                    <p className="text-[10px] text-red-600 font-black uppercase">Yanıtlanıyor...</p>
                    <button onClick={() => setReplyTo(null)} className="text-[10px] font-black text-gray-400 hover:text-red-600">İPTAL</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Yorum yaz..." className="flex-1 bg-transparent px-4 py-2 text-sm outline-none dark:text-white" />
                  <button onClick={handleComment} className="px-6 py-2 bg-red-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">GÖNDER</button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                    {selectedPano.profiles?.avatar_url ? <img src={selectedPano.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : null}
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase"><Username username={selectedPano.profiles?.username || selectedPano.username} isAdmin={adminEmails.includes(selectedPano.user_email)} /></p>
                    <span className="text-[9px] text-gray-400 font-bold">{new Date(selectedPano.created_at).toLocaleDateString('tr-TR')}</span>
                 </div>
              </div>
              <div className="flex gap-2">
                 <Link href={`/kitap/${selectedPano.book_id}`} className="flex-1 text-center bg-red-600 hover:bg-red-700 text-white font-black text-[10px] px-4 py-3 rounded-xl uppercase tracking-wider transition-all">KİTABA GİT →</Link>
                 {isOwner && <Link href={`/pano-duzenle/${selectedPano.id}`} className="bg-blue-600 text-white font-black text-[10px] px-4 py-3 rounded-xl uppercase">DÜZENLE</Link>}
                 {(isAdmin || isOwner) && <button onClick={handleDeletePano} className="bg-black dark:bg-white text-white dark:text-black font-black text-[10px] px-4 py-3 rounded-xl uppercase">SİL</button>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}