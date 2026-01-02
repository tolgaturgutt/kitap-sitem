'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Username from '@/components/Username';
import { createPanoVoteNotification, createPanoCommentNotification, createReplyNotification } from '@/lib/notifications';
import Image from 'next/image';

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

  // --- 1. VERİLERİ YÜKLE (OPTİMİZE EDİLDİ) ---
  useEffect(() => {
    if (!selectedPano) return;

    // State sıfırlama
    setPanoLikes(0);
    setHasLiked(false);
    setPanoComments([]);
    setChapterTitle(null);

    // 🚀 1. OPTİMİZASYON: Profil verisini tekrar çekme! 
    // Carousel'den zaten 'profiles' objesi dolu geliyor. Direkt onu kullan.
    if (selectedPano.profiles) {
      setPanoOwnerProfile(selectedPano.profiles);
    } else {
      // Çok nadir durumda (mesela direkt linkten geldiyse) çekelim
      fetchOwnerProfile(); 
    }

    // 🚀 2. OPTİMİZASYON: Her şeyi aynı anda (Paralel) çek
    async function loadPanoData() {
      const promises = [];

      // A) Bölüm Başlığı (Eğer varsa)
      if (selectedPano.chapter_id) {
        promises.push(
          supabase.from('chapters').select('title').eq('id', selectedPano.chapter_id).single()
            .then(({ data }) => ({ type: 'chapter', data }))
        );
      }

      // B) Beğeni Sayısı
      promises.push(
        supabase.from('pano_votes').select('*', { count: 'exact', head: true }).eq('pano_id', selectedPano.id)
          .then(({ count }) => ({ type: 'likes', count }))
      );

      // C) Kullanıcı Beğenmiş mi?
      if (user) {
        promises.push(
          supabase.from('pano_votes').select('id').eq('pano_id', selectedPano.id).eq('user_email', user.email).single()
            .then(({ data }) => ({ type: 'hasLiked', data }))
        );
      }

      // D) Yorumlar
      promises.push(
        supabase
          .from('pano_comments')
          .select(`*, profiles:user_id ( username, avatar_url )`)
          .eq('pano_id', selectedPano.id)
          .order('created_at', { ascending: true })
          .then(({ data }) => ({ type: 'comments', data }))
      );

      // HEPSİNİ BEKLE VE DAĞIT
      const results = await Promise.all(promises);

      results.forEach(res => {
        if (res.type === 'chapter' && res.data) setChapterTitle(res.data.title);
        if (res.type === 'likes') setPanoLikes(res.count || 0);
        if (res.type === 'hasLiked') setHasLiked(!!res.data);
        if (res.type === 'comments') setPanoComments(res.data || []);
      });
    }

    loadPanoData();
  }, [selectedPano, user]);

  // Yedek fonksiyon: Eğer Carousel'den profil gelmediyse
  async function fetchOwnerProfile() {
    let ownerQuery = supabase.from('profiles').select('username, avatar_url, email');
    if (selectedPano.user_id) {
      ownerQuery = ownerQuery.eq('id', selectedPano.user_id);
    } else {
      ownerQuery = ownerQuery.eq('email', selectedPano.user_email);
    }
    const { data } = await ownerQuery.single();
    if (data) setPanoOwnerProfile(data);
  }

  // --- 2. FONKSİYONLAR ---
  async function handleLike() {
    if (!user) return toast.error('Giriş yapmalısın!');
    
    // Optimistik Update (Kullanıcıya anında tepki ver)
    const originalHasLiked = hasLiked;
    const originalLikes = panoLikes;
    
    setHasLiked(!hasLiked);
    setPanoLikes(prev => hasLiked ? prev - 1 : prev + 1);

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || user.email.split('@')[0];
    
    if (originalHasLiked) {
      const { error } = await supabase.from('pano_votes').delete().eq('pano_id', selectedPano.id).eq('user_email', user.email);
      if (error) { // Hata olursa geri al
         setHasLiked(true);
         setPanoLikes(originalLikes);
      }
    } else {
      const { error } = await supabase.from('pano_votes').insert({ pano_id: selectedPano.id, user_email: user.email });
      if (error) { // Hata olursa geri al
         setHasLiked(false);
         setPanoLikes(originalLikes);
      } else {
         await createPanoVoteNotification(username, user.email, selectedPano.id, selectedPano.user_email);
      }
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

    // Yorumları tekrar çek
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
    
    const profileLink = user && comment.user_email === user.email 
      ? '/profil' 
      : `/yazar/${displayUsername}`;

    return (
      <div className={`flex gap-3 ${isReply ? 'ml-11' : ''}`}>
        <Link href={profileLink}>
         <div className={`relative ${isReply ? 'w-6 h-6' : 'w-8 h-8'} shrink-0 rounded-full overflow-hidden bg-gray-200`}>
            <Image 
              src={displayAvatar || '/avatar-placeholder.png'} 
              alt="User"
              fill
              unoptimized
              sizes="32px"
              className="object-cover"
            />
          </div>
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

  // Pano sahibi bilgileri (Öncelik: State > Props > Pano İçeriği)
  const ownerProfile = panoOwnerProfile || selectedPano.profiles;
  const ownerUsername = ownerProfile?.username || selectedPano.username;
  const ownerAvatar = ownerProfile?.avatar_url;
  const ownerEmail = ownerProfile?.email || selectedPano.user_email;
  
  const ownerProfileLink = user && ownerEmail === user.email 
    ? '/profil' 
    : `/yazar/${ownerUsername}`;
  
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
       {/* SOL TARAF: GÖRSEL (SAF HTML VERSİYONU - GARANTİ) */}
        {selectedPano.books?.cover_url && (
          <div className="shrink-0 hidden md:flex items-center justify-center p-8 bg-gray-50 dark:bg-black/40 md:w-1/2 h-full">
            <img 
              src={selectedPano.books.cover_url} 
              alt="Kapak"
              className="shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain rounded-2xl max-h-full w-auto h-auto max-w-full"
            />
          </div>
        )}

        {/* SAĞ TARAF */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#080808]">
          
          <div className="flex-1 overflow-y-auto p-8 md:p-12">
           {selectedPano.books?.cover_url && (
               <div className="md:hidden mb-6 rounded-2xl overflow-hidden border dark:border-white/5 shadow-xl bg-gray-50 dark:bg-black/40 p-4 flex items-center justify-center">
                <img 
                  src={selectedPano.books.cover_url} 
                  alt="Kapak"
                  className="shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain rounded-xl h-[250px] w-auto"
                />
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
                 <div className="relative w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                   {ownerAvatar ? (
                     <Image src={ownerAvatar} alt="User" fill unoptimized sizes="32px" className="object-cover" />
                   ) : (
                     <span className="text-xs font-bold">{ownerUsername?.[0] || 'U'}</span>
                   )}
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