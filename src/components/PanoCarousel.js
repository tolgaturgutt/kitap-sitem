'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function PanoCarousel({ onPanoClick, user }) {
  const [panolar, setPanolar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewedPanos, setViewedPanos] = useState(new Set());
  const scrollRef = useRef(null);

  useEffect(() => {
    async function getPanolar() {
      // Son 24 saatin panolarını çek
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

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
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (rawPanolar) {
        // Her pano için profil bilgisini çek
        const panoWithProfiles = await Promise.all(
          rawPanolar.map(async (pano) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('email', pano.user_email)
              .single();

            return {
              ...pano,
              profiles: profile
            };
          })
        );

        setPanolar(panoWithProfiles);
      }
      
      setLoading(false);
    }
    getPanolar();

    // Görüntülenen panoları localStorage'dan al
    if (typeof window !== 'undefined') {
      const viewed = localStorage.getItem('viewedPanos');
      if (viewed) {
        setViewedPanos(new Set(JSON.parse(viewed)));
      }
    }
  }, []);

  const handlePanoClick = (pano) => {
    // Panoyu görüntülendi olarak işaretle
    const newViewed = new Set(viewedPanos);
    newViewed.add(pano.id);
    setViewedPanos(newViewed);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('viewedPanos', JSON.stringify([...newViewed]));
    }

    if (onPanoClick) {
      onPanoClick(pano);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading || panolar.length === 0) return null;

  return (
    <div className="mb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 italic flex items-center gap-2">
          📋 Panolar
        </h2>
        <Link 
          href="/panolar"
          className="text-[10px] font-black uppercase text-gray-400 hover:text-blue-600 tracking-widest transition-all"
        >
          Tümünü Gör →
        </Link>
      </div>
      
      <div className="relative group">
        {/* Sol Ok */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border dark:border-gray-800 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
        >
          ←
        </button>

        {/* Sağ Ok */}
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border dark:border-gray-800 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
        >
          →
        </button>

        {/* Story Çemberleri */}
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide py-4 px-2 snap-x"
        >
          {panolar.map((pano) => {
            const isViewed = viewedPanos.has(pano.id);
            
            return (
              <button
                key={pano.id}
                onClick={() => handlePanoClick(pano)}
                className="flex-none snap-start group/story"
              >
                <div className="flex flex-col items-center gap-2">
                  {/* Profil Çemberi - Instagram Story Tarzı */}
                  <div className={`relative p-1 rounded-full ${
                    isViewed 
                      ? 'bg-gray-300 dark:bg-gray-700' 
                      : 'bg-gradient-to-tr from-green-400 via-green-500 to-green-600'
                  } transition-all group-hover/story:scale-110 duration-300`}>
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white dark:bg-gray-900 p-0.5">
                      {pano.profiles?.avatar_url ? (
                        <img 
                          src={pano.profiles.avatar_url} 
                          className="w-full h-full object-cover rounded-full" 
                          alt={pano.profiles.username}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center text-2xl font-black text-blue-600 dark:text-blue-300">
                          {pano.user_email[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kullanıcı Adı */}
                  <span className="text-[10px] font-bold text-center max-w-[90px] truncate dark:text-white">
                    {pano.profiles?.username || pano.user_email.split('@')[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}