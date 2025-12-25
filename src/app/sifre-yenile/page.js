'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function SifreYenile() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Sayfa yüklendiğinde oturum kontrolü (Opsiyonel ama güvenlik için iyi)
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Geçersiz veya süresi dolmuş bağlantı. Lütfen tekrar dene.");
        setTimeout(() => router.push('/giris'), 2000);
      }
    }
    checkSession();
  }, []);

  async function handleUpdatePassword() {
    if (!newPassword) {
      toast.error("Yeni şifreni girmelisin.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı.");
      return;
    }

    setLoading(true);

    // ✅ SUPABASE İLE ŞİFRE GÜNCELLEME
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast.error("Hata: " + error.message);
    } else {
      toast.success("Şifren başarıyla güncellendi! 🎉 Giriş sayfasına yönlendiriliyorsun...");
      
      // Güvenlik için oturumu kapatıp giriş sayfasına atabiliriz 
      // veya direkt ana sayfaya alabiliriz. Genelde tekrar giriş yaptırmak daha temizdir.
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push('/giris');
      }, 2000);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-black dark:text-white p-6 transition-colors">
      <Toaster position="top-right" />

      <div className="w-full max-w-md bg-gray-50 dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl">
        <h1 className="text-2xl font-bold mb-2 text-center">Yeni Şifre Belirle</h1>
        <p className="text-gray-500 mb-8 text-sm text-center">
          Hesabın için yeni ve güçlü bir şifre gir.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Yeni Şifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600"
              placeholder="******"
            />
          </div>

          <button
            onClick={handleUpdatePassword}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors mt-4 shadow-lg shadow-red-600/20"
          >
            {loading ? 'Güncelleniyor...' : 'Şifreyi Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}