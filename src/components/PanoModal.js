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
            
            return {
              ...comment,
              profiles: profile
            };
          })
        );
        setPanoComments(commentsWithProfiles);
      } else {
        setPanoComments([]);
      }
    }

    loadPanoData();
  }, [selectedPano, user]);

  // --- 2. BEĞENİ İŞLEMİ ---
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

  // --- 3. YORUM GÖNDERME ---
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

    if (error) {
      toast.error('Yorum eklenemedi!');
      return;
    }

    setNewComment('');
    setReplyTo(null);

    // Listeyi güncelle (manuel ekleme yaparak tekrar fetch etmeden hızlandırabiliriz ama garanti olsun diye çekiyoruz)
    const { data: comments } = await supabase
      .from('pano_comments')
      .select('*')
      .eq('pano_id', selectedPano.id)
      .order('created_at', { ascending: true });

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

  // --- 4. YORUM SİLME (YENİ ÖZELLİK) ---
  async function handleDeleteComment(commentId) {
    if (!confirm('Bu yorumu silmek istediğine emin misin?')) return;

    const { error } = await supabase.from('pano_comments').delete().eq('id', commentId);

    if (error) {
      toast.error('Silinirken hata oluştu');
    } else {
      toast.success('Yorum silindi');
      // Listeden çıkar
      setPanoComments(prev => prev.filter(c => c.id !== commentId));
    }
  }

  // --- 5. PANO SİLME ---
  async function handleDeletePano(e) {
    if (e) e.stopPropagation();
    if (!window.confirm('Bu panoyu silmek istediğine emin misin?')) return;

    const { error } = await supabase.from('panolar').delete().eq('id', selectedPano.id);

    if (error) {
      toast.error('Hata oluştu!');
    } else {
      toast.success('Pano silindi! 🗑️');
      if (onDelete) onDelete(selectedPano.id);
      onClose();
    }
  }

  // --- YARDIMCI: Yorum Kartı Bileşeni ---
  const CommentItem = ({ comment, isReply = false }) => {
    // Silme Yetkisi Var mı? (Admin || Pano Sahibi || Yorum Sahibi)
    const canDelete = isAdmin || isOwner || (user && user.email === comment.user_email);

    return (
      <div className={`flex gap-3 ${isReply ? 'ml-11' : ''}`}>
        {/* Profil Resmi */}
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
              <Username
                username={comment.profiles?.username || comment.username}
                isAdmin={adminEmails.includes(comment.user_email)}
              />
            </Link>
            
            {/* Silme Butonu (Sadece yetkiliye görünür) */}
            {canDelete && (
              <button 
                onClick={() => handleDeleteComment(comment.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-gray-300 hover:text-red-600 font-bold uppercase"
                title="Yorumu Sil"
              >
                SİL
              </button>
            )}
          </div>

          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-0.5">{comment.content}</p>
          
          {!isReply && (
            <button 
              onClick={() => setReplyTo(comment.id)} 
              className="text-[9px] text-gray-400 hover:text-red-600 font-bold mt-1 uppercase"
            >
              Yanıtla
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!selectedPano) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#080808] w-full max-w-5xl h-fit max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/10 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md"
        >
          ✕
        </button>

        {selectedPano.books?.cover_url && (
          <div className="shrink-0 flex items-center justify-center p-8 bg-gray-50 dark:bg-black/40 md:w-1/2">
            <img 
              src={selectedPano.books.cover_url} 
              className="shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain rounded-2xl max-h-[600px] w-auto" 
              alt="" 
            />
          </div>
        )}

        <div className="p-10 md:p-16 overflow-y-auto flex-1 flex flex-col">
          <span className="text-xs font-black text-red-600 tracking-[0.3em] uppercase mb-4 block">
            📖 {selectedPano.books?.title} {selectedPano.chapter_id && '• ' + (selectedPano.chapters?.title || 'Bölüm')}
          </span>

          <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tighter dark:text-white">
            {selectedPano.title}
          </h2>

          <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed font-medium whitespace-pre-wrap mb-8">
            {selectedPano.content}
          </p>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b dark:border-white/5">
            <button 
              onClick={handleLike} 
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all ${hasLiked ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
            >
              ❤️ {panoLikes}
            </button>
            <span className="text-sm text-gray-400">💬 {panoComments.length} yorum</span>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-4">Yorumlar</h3>
            
            <div className="flex-1 space-y-4 overflow-y-auto mb-6 pr-2">
              {panoComments.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Henüz yorum yapılmamış. İlk sen yap! 💬</p>
              ) : (
                panoComments.filter(c => !c.parent_id).map(comment => (
                  <div key={comment.id} className="space-y-3">
                    {/* Ana Yorum */}
                    <CommentItem comment={comment} />
                    
                    {/* Yanıtlar */}
                    {panoComments.filter(r => r.parent_id === comment.id).map(reply => (
                      <CommentItem key={reply.id} comment={reply} isReply={true} />
                    ))}
                  </div>
                ))
              )}
            </div>

            {user && (
              <div className="border-t dark:border-white/5 pt-4">
                {replyTo && (
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-red-600 font-black uppercase">Yanıtlıyorsun...</p>
                    <button onClick={() => setReplyTo(null)} className="text-xs text-gray-400 hover:text-red-600">İptal</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)} 
                    placeholder="Düşüncelerini yaz..." 
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-white/5 rounded-full text-sm outline-none focus:ring-2 focus:ring-red-600/20" 
                  />
                  <button onClick={handleComment} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-black transition-all">
                    GÖNDER
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t dark:border-white/5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                {selectedPano.profiles?.avatar_url ? (
                  <img src={selectedPano.profiles.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black">
                     {(selectedPano.username || "?")[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">
                  <Username 
                    username={selectedPano.profiles?.username || selectedPano.username} 
                    isAdmin={adminEmails.includes(selectedPano.user_email)} 
                  />
                </p>
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                  {new Date(selectedPano.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              {selectedPano.chapter_id && selectedPano.chapters?.id ? (
                <Link 
                  href={`/kitap/${selectedPano.book_id}/bolum/${selectedPano.chapter_id}`}
                  className="inline-flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-3 rounded-2xl uppercase tracking-wider transition-all shadow-2xl hover:shadow-red-600/50"
                >
                  {selectedPano.chapters?.title || 'Bölüme Git'} →
                </Link>
              ) : (
                <Link 
                  href={`/kitap/${selectedPano.book_id}`}
                  className="inline-flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-3 rounded-2xl uppercase tracking-wider transition-all shadow-2xl hover:shadow-red-600/50"
                >
                  Kitaba Git →
                </Link>
              )}

              {isOwner && (
                <Link 
                  href={`/pano-duzenle/${selectedPano.id}`}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black uppercase transition-all shadow-lg"
                >
                  DÜZENLE
                </Link>
              )}

              {(isAdmin || isOwner) && (
                <button 
                  onClick={handleDeletePano}
                  className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-lg"
                >
                  SİL {isAdmin && '(ADMIN)'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}