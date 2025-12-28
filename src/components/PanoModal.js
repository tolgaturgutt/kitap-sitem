'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Username from '@/components/Username';
import { createPanoVoteNotification, createPanoCommentNotification, createReplyNotification } from '@/lib/notifications';

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
  const [chapterTitle, setChapterTitle] = useState(null);
  
  // Pano sahibinin güncel profilini tutacak state
  const [panoOwnerProfile, setPanoOwnerProfile] = useState(null);

  // --- 1. VERİLERİ YÜKLE ---
  useEffect(() => {
    if (!selectedPano) return;

    setPanoLikes(0);
    setHasLiked(false);
    setPanoComments([]);
    setPanoOwnerProfile(null);
    setChapterTitle(null);

    async function loadPanoData() {
      // A) Pano Sahibinin GÜNCEL Bilgilerini Çek
      let ownerQuery = supabase.from('profiles').select('username, avatar_url, email');
      
      if (selectedPano.user_id) {
        ownerQuery = ownerQuery.eq('id', selectedPano.user_id);
      } else {
        ownerQuery = ownerQuery.eq('email', selectedPano.user_email);
      }
      
      const { data: ownerData } = await ownerQuery.single();
      if (ownerData) setPanoOwnerProfile(ownerData);

      // B) Bölüm bilgisini çek (eğer varsa)
      if (selectedPano.chapter_id) {
        const { data: chapterData } = await supabase
          .from('chapters')
          .select('title')
          .eq('id', selectedPano.chapter_id)
          .single();
        
        if (chapterData) setChapterTitle(chapterData.title);
      }

      // C) Beğeni Sayısı
      const { count } = await supabase
        .from('pano_votes')
        .select('*', { count: 'exact', head: true })
        .eq('pano_id', selectedPano.id);
      
      setPanoLikes(count || 0);

      // D) Kullanıcı beğenmiş mi?
      if (user) {
        const { data } = await supabase
          .from('pano_votes')
          .select('*')
          .eq('pano_id', selectedPano.id)
          .eq('user_email', user.email)
          .single();
        setHasLiked(!!data);
      }

      // E) Yorumları Çek
      const { data: comments } = await supabase
        .from('pano_comments')
        .select(`
          *,
          profiles:user_id ( username, avatar_url )
        `)
        .eq('pano_id', selectedPano.id)
        .order('created_at', { ascending: true });

      setPanoComments(comments || []);
    }

    loadPanoData();
  }, [selectedPano, user]);

  // --- 2. FONKSİYONLAR ---
  async function handleLike() {
    if (!user) return toast.error('Giriş yapmalısın!');
    
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || user.email.split('@')[0];
    
    if (hasLiked) {
      await supabase.from('pano_votes').delete().eq('pano_id', selectedPano.id).eq('user_email', user.email);
      setHasLiked(false);
      setPanoLikes(prev => prev - 1);
    } else {
      await supabase.from('pano_votes').insert({ pano_id: selectedPano.id, user_email: user.email });
      setHasLiked(true);
      setPanoLikes(prev => prev + 1);
      
      await createPanoVoteNotification(username, user.email, selectedPano.id, selectedPano.user_email);
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
      user_id: user.id,
      username: username,
      content: newComment
    });

    if (error) { toast.error('Hata oluştu!'); return; }

    // Bildirimler
    if (replyTo) {
      const parentComment = panoComments.find(c => c.id === replyTo);
      if (parentComment) {
        await createReplyNotification(username, user.email, parentComment.user_email, null, null, selectedPano.id);
      }
    } else {
      await createPanoCommentNotification(username, user.email, selectedPano.id, selectedPano.user_email);
    }

    setNewComment('');
    setReplyTo(null);

    const { data: comments } = await supabase
      .from('pano_comments')
      .select(`*, profiles:user_id ( username, avatar_url )`)
      .eq('pano_id', selectedPano.id)
      .order('created_at', { ascending: true });

    setPanoComments(comments || []);
    toast.success('Yorum eklendi!');
  }
async function handleReportComment(commentId, content) {
    if (!user) return toast.error('Giriş yapmalısın!');
    const reason = prompt("Şikayet sebebiniz nedir?");
    if (!reason || !reason.trim()) return;
    
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'pano_comment',
      target_id: commentId,
      reason: reason.trim(),
      content_snapshot: content,
      status: 'pending'
    });
    
    if (!error) {
      toast.success("Yorum raporlandı.");
    } else {
      console.error('Report error:', error);
      toast.error("Hata oluştu: " + error.message);
    }
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
    
    const displayAvatar = comment.profiles?.avatar_url;
    const displayUsername = comment.profiles?.username || comment.username;
    
    // ✅ Kendi yorumumuzsa /profil, değilse /yazar/username
    const profileLink = user && comment.user_email === user.email 
      ? '/profil' 
      : `/yazar/${displayUsername}`;

    return (
      <div className={`flex gap-3 ${isReply ? 'ml-11' : ''}`}>
        <Link href={profileLink}>
          <img
            src={displayAvatar || '/avatar-placeholder.png'}
            className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover bg-gray-200 cursor-pointer hover:ring-2 hover:ring-red-600 transition-all`}
            alt=""
            onError={(e) => { e.target.src = '/avatar-placeholder.png' }} 
          />
        </Link>
        <div className="flex-1 group">
          <div className="flex items-center gap-2">
            <Link 
              href={profileLink}
              className="text-[10px] md:text-xs font-black hover:text-red-600 transition-colors"
            >
              <Username username={displayUsername} isAdmin={adminEmails.includes(comment.user_email)} />
            </Link>
           {user && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                {canDelete ? (
                  <button onClick={() => handleDeleteComment(comment.id)} className="text-[9px] text-red-600 hover:underline font-bold uppercase">SİL</button>
                ) : (
                  <button onClick={() => handleReportComment(comment.id, comment.content)} className="text-[9px] text-gray-400 hover:text-red-600 font-bold uppercase">RAPOR</button>
                )}
              </div>
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

  // Pano sahibi bilgileri
  const ownerUsername = panoOwnerProfile?.username || selectedPano.profiles?.username || selectedPano.username;
  const ownerAvatar = panoOwnerProfile?.avatar_url || selectedPano.profiles?.avatar_url;
  const ownerEmail = panoOwnerProfile?.email || selectedPano.user_email;
  
  // ✅ Pano sahibi biziz mi kontrol et
  const ownerProfileLink = user && ownerEmail === user.email 
    ? '/profil' 
    : `/yazar/${ownerUsername}`;
  
  // ✅ Buton linki ve metni
  const buttonLink = selectedPano.chapter_id 
    ? `/kitap/${selectedPano.book_id}/bolum/${selectedPano.chapter_id}`
    : `/kitap/${selectedPano.book_id}`;
  
  const buttonText = selectedPano.chapter_id && chapterTitle
    ? `"${chapterTitle}" BÖLÜMÜNE GİT →`
    : 'KİTABA GİT →';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose}>
      <div className="bg-white dark:bg-[#080808] w-full max-w-5xl h-[85vh] md:h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/10 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md text-xl">✕</button>

        {/* SOL TARAF: GÖRSEL */}
        {selectedPano.books?.cover_url && (
          <div className="shrink-0 hidden md:flex items-center justify-center p-8 bg-gray-50 dark:bg-black/40 md:w-1/2 h-full">
            <img src={selectedPano.books.cover_url} className="shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain rounded-2xl max-h-full w-auto" alt="" />
          </div>
        )}

        {/* SAĞ TARAF */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#080808]">
          
          <div className="flex-1 overflow-y-auto p-8 md:p-12">
            {selectedPano.books?.cover_url && (
              <div className="md:hidden mb-6 rounded-2xl overflow-hidden border dark:border-white/5 shadow-xl bg-gray-50 dark:bg-black/40 p-4 flex items-center justify-center">
                <img src={selectedPano.books.cover_url} className="shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain rounded-xl max-h-[250px] w-auto" alt="" />
              </div>
            )}

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
              <Link href={ownerProfileLink} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                 <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                    {ownerAvatar ? <img src={ownerAvatar} className="w-full h-full object-cover" alt="" /> : (ownerUsername?.[0] || 'U')}
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase"><Username username={ownerUsername} isAdmin={adminEmails.includes(ownerEmail)} /></p>
                    <span className="text-[9px] text-gray-400 font-bold">{new Date(selectedPano.created_at).toLocaleDateString('tr-TR')}</span>
                 </div>
              </Link>
              <div className="flex gap-2">
                 <Link href={buttonLink} className="flex-1 text-center bg-red-600 hover:bg-red-700 text-white font-black text-[10px] px-4 py-3 rounded-xl uppercase tracking-wider transition-all">
                   {buttonText}
                 </Link>
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