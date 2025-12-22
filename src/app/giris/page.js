'use client'; // <-- BU SATIR ÇOK ÖNEMLİ, EKSİK OLURSA HATA VERİR

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function GirisSayfasi() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); 
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAuth() {
    if (!email || !password) {
      toast.error('E-posta ve şifre şart kral.');
      return;
    }

    if (isSignUp && (!username || !fullName)) {
      toast.error('Ad Soyad ve Kullanıcı Adı seçmelisin.');
      return;
    }

    setLoading(true);
    let error = null;

    if (isSignUp) {
      // --- KAYIT OLMA (Aynı kaldı) ---
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            full_name: fullName,
          },
        },
      });
      error = signUpError;

    } else {
      // --- GİRİŞ YAPMA (GÜNCELLENDİ - BAN KONTROLÜ EKLENDİ) ---
      
      // 1. Önce giriş yapmayı dene
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = signInError;

      // 2. Giriş başarılıysa hemen profili kontrol et: BANLI MI?
      if (!error && data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_banned')
          .eq('id', data.user.id)
          .single();

        // Eğer kullanıcı banlıysa...
        if (profile && profile.is_banned) {
          await supabase.auth.signOut(); // Hemen çıkış yaptır
          toast.error('BU HESAP YASAKLANMIŞTIR! 🚫 Yöneticiyle görüş.');
          setLoading(false);
          return; // Fonksiyonu burada durdur, yönlendirme yapma!
        }
      }
    }

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success(isSignUp ? 'Aramıza hoş geldin!' : 'Tekrar hoş geldin!');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-black dark:text-white p-6 transition-colors">
      <Toaster position="top-right" />

      <div className="w-full max-w-md bg-gray-50 dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-center">
          {isSignUp ? 'Hesap Oluştur' : 'Giriş Yap'}
        </h1>
        <p className="text-gray-500 mb-8 text-sm text-center">
          {isSignUp ? 'Hikayeni yazmaya başla.' : 'Kaldığın yerden devam et.'}
        </p>

        <div className="space-y-4">
          
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Ad Soyad</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600"
                  placeholder="Örn: Yusuf Turgut"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600"
                  placeholder="Örn: yucufer"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600"
              placeholder="mail@ornek.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600"
              placeholder="******"
            />
          </div>

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors mt-4 shadow-lg shadow-red-600/20"
          >
            {loading ? 'İşleniyor...' : (isSignUp ? 'Kayıt Ol' : 'Giriş Yap')}
          </button>

          <div className="text-center mt-4 text-sm text-gray-500">
            {isSignUp ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?'}
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-red-600 hover:underline font-bold"
            >
              {isSignUp ? 'Giriş Yap' : 'Hemen Kayıt Ol'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}