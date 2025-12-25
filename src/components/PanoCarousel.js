'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Username from '@/components/Username';

export default function PanoCarousel({ onPanoClick }) {
  const [panolar, setPanolar] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adminEmails, setAdminEmails] = useState([]);
  const [selectedPano, setSelectedPano] = useState(null); // Fallback için

  const handlePanoClick = (pano) => {
    if (onPanoClick) {
      onPanoClick(pano);
    } else {
      setSelectedPano(pano);
    }
  };

  useEffect(() => {
    async function getPanolar() {
      // Admin listesini çek
      const { data: adminList } = await supabase
        .from('announcement_admins')
        .select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      setAdminEmails(emails);

      // Panoları çek (kitap ve bölüm bilgileriyle)
      const { data: rawPanolar } = await supabase
        .from('panolar')
        .select(`
          *,
          books (
            id,
            title,
            cover_url
          ),
          chapters (
            id,
            title
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (rawPanolar) {
        // Her pano için profil bilgisini ayrı çek
        const panoWithProfiles = await Promise.all(
          rawPanolar.map(async (pano) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('email', pano.user_email)
              .single();

            return {
              ...pano,
              profiles: profile,
              is_admin: emails.includes(pano.user_email)
            };
          })
        );

        setPanolar(panoWithProfiles);
      }
      
      setLoading(false);
    }
    getPanolar();
  }, []);

  useEffect(() => {
    if (panolar.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % panolar.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [panolar.length]);

  const scroll = (direction) => {
    if (direction === 'left') {
      setActiveIndex((prev) => (prev - 1 + panolar.length) % panolar.length);
    } else {
      setActiveIndex((prev) => (prev + 1) % panolar.length);
    }
  };

  if (loading || panolar.length === 0) return null;

  return (
    <div className="mb-20">
      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 mb-6 italic flex items-center gap-2">
        📋 Panolar
      </h2>
      
      <div className="relative group">
        {/* SOL OK */}
        {panolar.length > 1 && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border dark:border-gray-800 rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
          >
            ←
          </button>
        )}

        {/* SAĞ OK */}
        {panolar.length > 1 && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border dark:border-gray-800 rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
          >
            →
          </button>
        )}

        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {panolar.map((pano, idx) => (
              <div key={idx} className="w-full flex-shrink-0">
                <div
                  onClick={() => handlePanoClick(pano)}
                  className="w-full group/card block bg-white dark:bg-white/5 border dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 hover:border-blue-600 transition-all shadow-xl shadow-black/5 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-6">
                    
                    {/* SOL: Profil Resmi */}
                    <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 flex items-center justify-center font-black text-xl border-4 border-gray-200 dark:border-gray-800 shadow-lg">
                      {pano.profiles?.avatar_url ? (
                        <img src={pano.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        pano.user_email[0].toUpperCase()
                      )}
                    </div>

                    {/* ORTA: Başlık + İçerik */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <Username 
                          username={pano.profiles?.username || pano.username} 
                          isAdmin={pano.is_admin}
                          className="text-[10px] font-bold uppercase tracking-widest"
                        />
                      </div>
                      
                      <h3 className="text-2xl md:text-3xl font-black dark:text-white mb-2 group-hover/card:text-blue-600 transition-colors uppercase tracking-tight line-clamp-2">
                        {pano.title}
                      </h3>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {pano.content}
                      </p>
                      
                      <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full tracking-tighter mt-4">
                        Detayları Gör →
                      </div>
                    </div>

                    {/* SAĞ: Kitap Kapağı */}
                    {pano.books?.cover_url && (
                      <div className="shrink-0 rounded-2xl overflow-hidden border dark:border-white/5 shadow-lg h-28 md:h-36 w-auto">
                        <img 
                          src={pano.books.cover_url} 
                          className="h-full w-auto object-cover group-hover/card:scale-110 transition-transform duration-500" 
                          alt={pano.books.title} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Indicator Dots */}
        {panolar.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {panolar.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === activeIndex 
                    ? 'w-8 bg-blue-600' 
                    : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}