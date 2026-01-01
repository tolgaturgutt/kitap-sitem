'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function WarningSystem() {
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    let channel;

    const setupWarningSystem = async () => {
      // 1. Önce kullanıcının kim olduğunu öğrenelim
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return; // Giriş yapmamışsa nöbet tutmaya gerek yok

      // 2. İlk Yükleme Kontrolü: Zaten yemiş olduğu bir uyarı var mı?
      checkExistingWarning(user.id);

      // 3. CANLI YAYIN (Realtime): Adam sitedeyken uyarı gelirse anında yakala
      channel = supabase
        .channel('public:warnings')
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'warnings',
            filter: `user_id=eq.${user.id}` // Sadece bana gelen uyarıları dinle
          },
          (payload) => {
            // Yeni uyarı geldiyse hemen ekrana bas
            if (!payload.new.is_seen) {
              setWarning(payload.new);
            }
          }
        )
        .subscribe();
    };

    setupWarningSystem();

    // Temizlik (Sayfadan çıkarsa dinlemeyi bırak)
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function checkExistingWarning(userId) {
    // Veritabanına sor: "Bu adamın görmediği (is_seen: false) cezası var mı?"
    const { data } = await supabase
      .from('warnings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_seen', false)
      .limit(1)
      .maybeSingle();

    if (data) {
      setWarning(data);
    }
  }

  async function handleDismiss() {
    if (!warning) return;

    // "Okudum, Anladım" butonuna basınca:
    const { error } = await supabase
      .from('warnings')
      .update({ is_seen: true }) // Görüldü işaretle
      .eq('id', warning.id);

    if (!error) {
      setWarning(null); // Modalı kapat, adamı özgür bırak
    }
  }

  // Eğer uyarı yoksa, bu bileşen görünmezdir (Hayalet)
  if (!warning) return null;

  // --- RACON MODU (EKRAN KARARTMA) ---
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6 animate-in fade-in duration-300">
      {/* Kilit Sistemi: Arkaya tıklanmasını engeller */}
      <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-lg rounded-[2rem] p-8 border-2 border-red-600 shadow-[0_0_100px_rgba(220,38,38,0.4)] text-center relative overflow-hidden">
        
        {/* Arka Plan Efekti (Kırmızı Siren Işığı Gibi) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-20 bg-red-600/20 blur-3xl"></div>

        <div className="relative z-10">
          <div className="w-24 h-24 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <span className="text-6xl">⚠️</span>
          </div>

          <h2 className="text-3xl font-black text-red-600 mb-2 uppercase tracking-tighter">
            TOPLULUK UYARISI
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-8">
            HESABINIZLA İLGİLİ BİLDİRİM
          </p>

          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-6 rounded-2xl mb-8">
            <p className="text-sm font-black text-red-800 dark:text-red-200 uppercase mb-2">
              İHLAL NEDENİ:
            </p>
            <p className="text-xl font-medium text-black dark:text-white">
              "{warning.reason}"
            </p>
          </div>

          <p className="text-xs text-gray-400 mb-8 px-4 leading-relaxed">
            KitapLab topluluk kurallarına aykırı davranışlar tespit edilmiştir. 
            Bu bir resmi uyarıdır. İhlallerin devam etmesi durumunda hesabınız 
            <span className="text-red-600 font-bold"> kısıtlanacaktır.</span>
          </p>

          <button
            onClick={handleDismiss}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl text-sm uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-red-600/40 active:scale-95 transform"
          >
            OKUDUM, ANLADIM
          </button>
        </div>
      </div>
    </div>
  );
}