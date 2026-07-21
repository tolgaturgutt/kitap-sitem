'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Şifre Değiştirme State'leri
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Şifremi Unuttum Modal State'leri
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetInput, setResetInput] = useState(''); 
  const [resetLoading, setResetLoading] = useState(false);

  // --- YENİ: HESAP SİLME MODAL STATE'LERİ ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Oturum Kontrolü
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/giris');
      } else {
        setUser(session.user);
      }
    };
    checkUser();
  }, [router]);

  // --- 1. SENARYO: ŞİFRE DEĞİŞTİRME ---
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalı.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler uyuşmuyor.');
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        toast.error('Mevcut şifreni yanlış girdin.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast.success('Şifren başarıyla güncellendi!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Hata: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. SENARYO: ŞİFRE SIFIRLAMA ---
// --- 2. SENARYO: ŞİFRE SIFIRLAMA (SADECE E-POSTA) ---
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const emailToSend = resetInput.trim();

    // 1. Boş mu kontrolü
    if (!emailToSend) return toast.error('Lütfen e-posta adresinizi yazın.');

    // 2. E-posta formatı kontrolü (@ var mı?)
    if (!emailToSend.includes('@')) {
      return toast.error('Lütfen geçerli bir e-posta adresi giriniz.');
    }

    setResetLoading(true);

    try {
      // 3. Direkt E-postaya gönder
      const { error } = await supabase.auth.resetPasswordForEmail(emailToSend, {
        redirectTo: `${window.location.origin}/sifre-yenile`,
      });

      if (error) throw error;

      toast.success('Sıfırlama bağlantısı e-postana gönderildi! 📧', {
        id: 'password-reset-email',
      });
      setShowForgotModal(false); // Modalı kapat
      setResetInput('');         // Kutuyu temizle

    } catch (error) {
      // Güvenlik için detaylı hata vermek yerine genel konuşabiliriz ama şimdilik hata mesajını basalım
      toast.error('Hata: ' + error.message);
    } finally {
      setResetLoading(false);
    }
  };

  // --- 3. SENARYO: GERÇEK HESAP SİLME (Şifre Kontrollü) ---
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteLoading(true);

    try {
      // 1. Önce şifreyi doğrula (Giriş yapmayı deneyerek)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      });

      if (authError) {
        toast.error('Şifreni yanlış girdin, hesabı silemezsin.');
        setDeleteLoading(false);
        return;
      }

      // 2. Şifre doğruysa, Supabase'e yazdığımız SQL fonksiyonunu çağır
      // Bu fonksiyon hem Auth kullanıcısını hem de (cascade varsa) profili siler.
      // Profil silmeyi de garantiye almak için RPC çağırıyoruz.
      
      const { error: rpcError } = await supabase.rpc('delete_user');

      if (rpcError) throw rpcError;

      // 3. Başarılı
      toast.success('Hesabın tamamen silindi. Yolun açık olsun 👋');
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();

    } catch (error) {
      console.error(error);
      toast.error('Silme başarısız: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black py-12 px-4 md:px-8">
      
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* BAŞLIK */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 rounded-full border dark:border-white/10 hover:scale-110 transition-transform">
            ←
          </Link>
          <div>
            <h1 className="text-3xl font-black text-black dark:text-white tracking-tight">Hesap Ayarları</h1>
            <p className="text-sm text-gray-500 font-medium">Güvenlik ve hesap yönetimi.</p>
          </div>
        </div>

        {/* 1. KUTU: GÜVENLİK VE ŞİFRE */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-white/5 rounded-[2rem] p-8 shadow-xl shadow-black/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 text-lg">
              🔐
            </div>
            <div>
              <h2 className="text-lg font-black dark:text-white">Şifre Değiştir</h2>
              <p className="text-xs text-gray-400 font-medium">Şifreni biliyorsan buradan değiştir.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Mevcut Şifren</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Şu anki şifreni gir..."
                className="w-full h-12 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Yeni Şifre</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni şifren..."
                  className="w-full h-12 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Yeni Şifre (Tekrar)</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Onayla..."
                  className="w-full h-12 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-black dark:bg-white text-white dark:text-black font-black py-4 rounded-xl hover:scale-[1.01] transition-transform uppercase tracking-widest text-xs disabled:opacity-50 shadow-lg"
                >
                  {loading ? 'Kontrol Ediliyor...' : 'Şifreyi Güncelle'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-bold text-gray-400 hover:text-red-600 transition-colors text-center py-2"
                >
                  Mevcut şifremi unuttum?
                </button>
            </div>
          </form>
        </div>

        {/* 2. KUTU: OTURUM KAPAT */}
        <div className="bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-white/5 rounded-[2rem] p-8 shadow-xl shadow-black/5">
             <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              🚪 Oturumu Kapat
            </button>
        </div>

        {/* 3. KUTU: TEHLİKELİ BÖLGE */}
        <div className="border border-red-100 dark:border-red-900/30 rounded-[2rem] p-8 bg-red-50/30 dark:bg-red-950/10">
          <h2 className="text-red-600 font-black uppercase tracking-widest text-xs mb-4">Tehlikeli Bölge</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Hesabını silmek geri alınamaz. Tüm verilerin ve giriş yetkin kaybolur.
          </p>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
          >
            Hesabımı Sil
          </button>
        </div>

      </div>

      {/* --- MODAL 1: ŞİFRE SIFIRLAMA --- */}
 {/* --- MODAL 1: ŞİFRE SIFIRLAMA --- */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2rem] p-8 relative shadow-2xl animate-in zoom-in-95">
              <button onClick={() => setShowForgotModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 hover:text-black font-bold">✕</button>
              
              <h3 className="text-xl font-black dark:text-white mb-2">Şifre Sıfırlama</h3>
              {/* 👇 Yazıyı değiştirdik */}
              <p className="text-sm text-gray-500 mb-6">Hesabına kayıtlı e-posta adresini gir.</p>
              
              <form onSubmit={handleForgotPassword} className="space-y-4">
                 <input 
                    type="email" // 👇 Klavye @ işaretli açılsın
                    value={resetInput} 
                    onChange={(e) => setResetInput(e.target.value)} 
                    placeholder="mail@ornek.com" // 👇 Placeholder değişti
                    className="w-full h-12 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 outline-none focus:border-red-500 transition-colors" 
                 />
                 <button 
                    type="submit" 
                    disabled={resetLoading} 
                    className="w-full bg-red-600 text-white font-black py-3 rounded-xl hover:bg-red-700 transition-colors"
                 >
                    {resetLoading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* --- MODAL 2: HESAP SİLME ONAYI (YENİ) --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-900/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2rem] p-8 relative shadow-2xl animate-in zoom-in-95 border-2 border-red-500">
              <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 hover:text-black font-bold">✕</button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
                <h3 className="text-2xl font-black dark:text-white mb-2">Emin misin?</h3>
                <p className="text-sm text-gray-500">
                  Bu işlem geri alınamaz. Hesabını silmek için lütfen <b>mevcut şifreni</b> gir.
                </p>
              </div>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                 <div>
                    <input 
                      type="password" 
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Mevcut Şifren"
                      className="w-full h-12 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 outline-none focus:border-red-500 transition-colors text-center font-bold"
                      required
                    />
                 </div>
                 <button 
                  type="submit"
                  disabled={deleteLoading}
                  className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 uppercase tracking-widest"
                 >
                   {deleteLoading ? 'Siliniyor...' : 'Evet, Hesabımı Sil'}
                 </button>
                 <button 
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                 >
                   Vazgeç
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}
