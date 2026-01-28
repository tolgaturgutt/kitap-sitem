'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Username from '@/components/Username';
import Image from 'next/image';

export default function PanoCarousel({ onPanoClick, user }) {
  const [panolar, setPanolar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewedPanos, setViewedPanos] = useState(new Set());
  const [adminEmails, setAdminEmails] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function getPanolar() {
      // 1. Admin Listesini Çek
      const { data: admins } = await supabase.from('announcement_admins').select('user_email');
      const emailsList = admins?.map(a => a.user_email) || [];
      setAdminEmails(emailsList);

      // 2. Panoları Çek (Son 24 saat)
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
      
      if (rawPanolar && rawPanolar.length > 0) {
        // 🔥🔥🔥 OPTİMİZASYON BURADA 🔥🔥🔥
        // Hamallık bitti! Tek tek sormak yerine, e-postaları toplayıp toplu soruyoruz.
        
        // 1. Panolardaki tüm e-postaları al (Tekrar edenleri temizle)
        const userEmails = [...new Set(rawPanolar.map(p => p.user_email))];

        // 2. Bu e-postalara ait profilleri TEK SEFERDE çek
        const { data: profiles } = await supabase
          .from('profiles')
          .select('email, username, avatar_url,role')
          .in('email', userEmails);

        // 3. Profilleri panolarla eşleştir (Hafızada birleştirme)
        const panoWithProfiles = rawPanolar.map(pano => {
          const profile = profiles?.find(p => p.email === pano.user_email);
          return {
            ...pano,
            profiles: profile // Eşleşen profili buraya gömüyoruz
          };
        });

        setPanolar(panoWithProfiles);
      } else {
        setPanolar([]);
      }
      
      setLoading(false);
    }
    getPanolar();

    if (typeof window !== 'undefined') {
      const viewed = localStorage.getItem('viewedPanos');
      if (viewed) {
        setViewedPanos(new Set(JSON.parse(viewed)));
      }
    }
  }, []);

  const handlePanoClick = (pano) => {
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
        {/* 🔴 BUTONLAR SADECE DESKTOP'TA GÖRÜNSÜN */}
        <button 
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border dark:border-gray-800 rounded-full items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
        >
          ←
        </button>

        <button 
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border dark:border-gray-800 rounded-full items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
        >
          →
        </button>

        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide py-4 px-2 snap-x"
        >
          {panolar.map((pano) => {
            const isViewed = viewedPanos.has(pano.id);
            const isAdmin = adminEmails.includes(pano.user_email);
            
            return (
              <button
                key={pano.id}
                onClick={() => handlePanoClick(pano)}
                className="flex-none snap-start group/story"
              >
                <div className="flex flex-col items-center gap-2">
                  
                  {/* ✅ Story Çerçevesi Ayarı */}
                  <div className={`relative p-1 rounded-full ${
                    isViewed 
                      ? 'bg-gray-300 dark:bg-gray-700' // Okunduysa GRİ
                      : (isAdmin 
                          ? 'bg-gradient-to-tr from-yellow-300 via-yellow-400 to-yellow-500' // Admin: SARI
                          : 'bg-gradient-to-tr from-green-400 via-green-500 to-green-600'   // Normal: YEŞİL
                        )
                  } transition-all group-hover/story:scale-110 duration-300`}>
                    
                   {/* 👇 'relative' ekledik ki resim taşmasın */}
                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-white dark:bg-gray-900 p-0.5">
                      {pano.profiles?.avatar_url ? (
                        <Image 
                          src={pano.profiles.avatar_url} 
                          alt={pano.profiles.username || 'User'}
                          fill
                          unoptimized
                          sizes="80px"
                          className="object-cover rounded-full"
                        />
                      ) : (
                        <div className={`w-full h-full rounded-full flex items-center justify-center text-2xl font-black ${
                          isAdmin 
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' 
                            : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-600 dark:text-blue-300'
                        }`}>
                          {(pano.profiles?.username || pano.user_email)[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="max-w-[100px] flex justify-center">
                    <Username 
                      username={pano.profiles?.username || pano.user_email.split('@')[0]}
                      isAdmin={isAdmin}
                      isPremium={pano.profiles?.role === 'premium'}
                      className="text-[10px] font-bold text-center truncate dark:text-white"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}