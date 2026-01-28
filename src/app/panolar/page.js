'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';
import PanoModal from '@/components/PanoModal'; // ✅ MODAL IMPORT EDİLDİ

export default function TumPanolar() {
  const [user, setUser] = useState(null);
  const [panos, setPanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPano, setSelectedPano] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);

  // Not: Eski modal state'leri (likes, comments vb.) silindi, PanoModal hallediyor.

  useEffect(() => {
    async function loadData() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      setUser(activeUser);

      // Admin kontrolü
      const { data: admins } = await supabase.from('announcement_admins').select('user_email');
      const emails = admins?.map(a => a.user_email) || [];
      setAdminEmails(emails);
      
      if (activeUser && emails.includes(activeUser.email)) {
        setIsAdmin(true);
      }

      // Son 24 saatin panoları
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: panosData } = await supabase
        .from('panolar')
        .select('*, books(title, cover_url), chapters(id, title)')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

      // Her pano için profil bilgisini ayrı çek (Modalda resim görünsün diye)
      if (panosData && panosData.length > 0) {
        const panosWithProfiles = await Promise.all(
          panosData.map(async (pano) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url,role')
              .eq('email', pano.user_email)
              .single();
            
            return {
              ...pano,
              profiles: profile
            };
          })
        );
        setPanos(panosWithProfiles);
      } else {
        setPanos([]);
      }
      
      setLoading(false);
    }
    loadData();
  }, []);

  // Listeden Silme Fonksiyonu (Kart üzerindeki buton için)
  async function handleDeletePano(panoId, e) {
    if (e) e.stopPropagation();
    if (!window.confirm('Bu panoyu silmek istediğine emin misin?')) return;

    const { error } = await supabase.from('panolar').delete().eq('id', panoId);

    if (error) {
      toast.error('Silinirken hata oluştu!');
    } else {
      toast.success('Pano silindi! 🗑️');
      setPanos(prev => prev.filter(p => p.id !== panoId));
      if (selectedPano?.id === panoId) setSelectedPano(null);
    }
  }

  // Modal içinden silinirse listeyi güncelle
  const handleModalDelete = (deletedId) => {
    setPanos(prev => prev.filter(p => p.id !== deletedId));
  };

  if (loading) return (
    <div className="py-40 flex justify-center items-center animate-pulse">
      <div className="text-5xl font-black tracking-tighter">
        <span className="text-black dark:text-white">Kitap</span>
        <span className="text-red-600">Lab</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-10 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <Toaster />

      {/* ✅ PANO MODAL BİLEŞENİ */}
      <PanoModal 
        selectedPano={selectedPano} 
        onClose={() => setSelectedPano(null)} 
        user={user}
        adminEmails={adminEmails}
        isAdmin={isAdmin}
        // Panoyu açan kişi panonun sahibi mi?
        isOwner={user && selectedPano && (user.email === selectedPano.user_email)}
        onDelete={handleModalDelete}
      />

      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-12 flex flex-col items-center gap-6 bg-white dark:bg-white/5 p-10 rounded-[4rem] border dark:border-white/5 shadow-sm">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-black uppercase dark:text-white tracking-tighter mb-2">📋 Tüm Panolar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide">Son 24 saatin panoları</p>
          </div>
          
          <div className="flex gap-12 border-t dark:border-white/5 pt-6 w-full justify-center">
            <div className="text-center">
              <p className="text-2xl font-black text-red-600">{panos.length}</p>
              <p className="text-[9px] uppercase opacity-40 tracking-widest">Toplam Pano</p>
            </div>
          </div>
        </header>

        {/* PANOLAR LİSTESİ */}
        <div className="space-y-6">
          {panos.length === 0 ? (
            <div className="text-center py-20 text-gray-500 italic">Son 24 saatte hiç pano oluşturulmamış.</div>
          ) : (
            panos.map(pano => (
              <div 
                key={pano.id} 
                onClick={() => setSelectedPano(pano)}
                className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border dark:border-white/10 flex gap-6 relative group hover:border-red-600/30 transition-all cursor-pointer"
              >
                {/* Kart Görseli */}
                <div className="w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10">
                  {pano.books?.cover_url ? <img src={pano.books.cover_url} className="w-full h-full object-cover" alt="" /> : null}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-black dark:text-white mb-2 line-clamp-1 group-hover:text-red-600 transition-colors">{pano.title}</h3>
                  <p className="text-[10px] text-red-600 font-bold uppercase mb-2 tracking-widest">
                    📖 {pano.books?.title} {pano.chapter_id && '• ' + (pano.chapters?.title || 'Bölüm')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{pano.content}</p>
                  
                  {/* Yazar Bilgisi */}
                  <div className="flex items-center gap-2 mb-4">
                    <img
                      src={pano.profiles?.avatar_url || '/avatar-placeholder.png'}
                      className="w-6 h-6 rounded-full object-cover"
                      alt=""
                      onError={(e) => { e.target.src = '/avatar-placeholder.png' }}
                    />
                    <Link 
                      href={pano.user_email === user?.email ? '/profil' : `/yazar/${pano.profiles?.username || pano.username}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-black hover:text-red-600 transition-colors"
                    >
                     <Username
  username={pano.profiles?.username || pano.username}
  isAdmin={adminEmails.includes(pano.user_email)}
  isPremium={pano.profiles?.role === 'premium'} // 👈 YENİ EKLENEN
/>
                    </Link>
                    <span className="text-[9px] text-gray-400">•</span>
                    <span className="text-[9px] text-gray-400 font-bold">
                      {new Date(pano.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full tracking-tighter">
                    Detayları Gör →
                  </div>
                </div>

                {/* Admin Silme Butonu (Kart üzerinde) */}
                {isAdmin && (
                  <button 
                    onClick={(e) => handleDeletePano(pano.id, e)}
                    className="absolute top-6 right-6 px-3 py-1 bg-red-600 text-white rounded-full text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    SİL
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}