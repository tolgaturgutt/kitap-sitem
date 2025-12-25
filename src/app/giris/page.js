'use client'; 

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function GirisSayfasi() {
  // loginInput: Hem e-posta hem kullanıcı adı tutar
  const [loginInput, setLoginInput] = useState(''); 
  const [password, setPassword] = useState('');
  
  // Kayıt olma için ek alanlar
  const [username, setUsername] = useState(''); 
  const [fullName, setFullName] = useState('');
  
  // Modlar
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false); // Şifre sıfırlama modu
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // E-posta formatı kontrolü için yardımcı fonksiyon
  const isEmail = (text) => text.includes('@');

  // --- ŞİFRE SIFIRLAMA ---
  async function handleResetPassword() {
    if (!loginInput) {
      toast.error('Lütfen e-posta adresinizi veya kullanıcı adınızı giriniz.');
      return;
    }

    setLoading(true);
    let targetEmail = loginInput;

    // Eğer girilen değer e-posta değilse (kullanıcı adıysa), veritabanından e-postayı bul
    if (!isEmail(loginInput)) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', loginInput) // Büyük/küçük harf duyarsız arama
        .single();

      if (profileError || !profileData) {
        toast.error('Bu kullanıcı adı ile eşleşen bir hesap bulunamadı.');
        setLoading(false);
        return;
      }
      targetEmail = profileData.email;
    }

    // E-postaya sıfırlama bağlantısı gönder
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/sifre-yenile`, // Şifre yenileme sayfası
    });

    if (error) {
      toast.error('Bir hata oluştu: ' + error.message);
    } else {
      toast.success('Şifre sıfırlama bağlantısı kayıtlı e-posta adresinize gönderildi.');
      setIsResetMode(false); // Giriş ekranına dön
    }
    setLoading(false);
  }

  // --- GİRİŞ / KAYIT ---
  async function handleAuth() {
    // 1. Şifre Sıfırlama Modundaysa
    if (isResetMode) {
      await handleResetPassword();
      return;
    }

    // 2. Boş alan kontrolü
    if (!loginInput || !password) {
      toast.error('Lütfen tüm alanları doldurunuz.');
      return;
    }

    if (isSignUp && (!username || !fullName)) {
      toast.error('Ad Soyad ve Kullanıcı Adı alanları zorunludur.');
      return;
    }

    setLoading(true);
    let error = null;

    if (isSignUp) {
      // --- KAYIT OLMA ---
      // Kayıtta loginInput her zaman e-posta olmalı
      if (!isEmail(loginInput)) {
        toast.error('Kayıt işlemi için geçerli bir e-posta adresi giriniz.');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: loginInput,
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
      // --- GİRİŞ YAPMA ---
      
      let finalEmail = loginInput;

      // Eğer girilen değer e-posta değilse (yani kullanıcı adıysa), e-postayı bulmaya çalış
      if (!isEmail(loginInput)) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', loginInput)
          .single();

        if (profileError || !profileData) {
          toast.error('Bu kullanıcı bilgileriyle bir hesap bulunamadı.');
          setLoading(false);
          return;
        }
        
        finalEmail = profileData.email;
      }

      // 1. Giriş yapmayı dene (Email ile)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
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
          toast.error('Hesabınız askıya alınmıştır. Lütfen yönetici ile iletişime geçiniz.');
          setLoading(false);
          return; 
        }
      }
    }

    if (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Giriş bilgileri hatalı.' : error.message);
      setLoading(false);
    } else {
      toast.success(isSignUp ? 'Kayıt başarılı! Lütfen e-posta adresinizi doğrulayınız.' : 'Giriş başarılı.');
      
      if (!isSignUp) {
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);
      } else {
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-black dark:text-white p-6 transition-colors">
      <Toaster position="top-right" />

      <div className="w-full max-w-md bg-gray-50 dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-center">
          {isResetMode ? 'Şifremi Unuttum' : (isSignUp ? 'Hesap Oluştur' : 'Giriş Yap')}
        </h1>
        <p className="text-gray-500 mb-8 text-sm text-center">
          {isResetMode 
            ? 'Hesabınıza ait e-posta veya kullanıcı adını giriniz.' 
            : (isSignUp ? 'Yeni bir hesap oluşturun.' : 'Hesabınıza giriş yapın.')}
        </p>

        <div className="space-y-4">
          
          {/* Sadece Kayıt Modunda Gözükecekler */}
          {isSignUp && !isResetMode && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Ad Soyad</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600"
                  placeholder="Adınız Soyadınız"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600"
                  placeholder="kullaniciadi"
                />
              </div>
            </>
          )}

          {/* E-posta veya Kullanıcı Adı Alanı */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              {/* Reset modunda veya Giriş modunda ikisi de olabilir, Kayıtta sadece E-posta */}
              {isSignUp && !isResetMode ? 'E-posta Adresi' : 'E-posta veya Kullanıcı Adı'}
            </label>
            <input
              type="text" 
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600"
              placeholder={isSignUp && !isResetMode ? "mail@ornek.com" : "mail@ornek.com veya kullaniciadi"}
            />
          </div>

          {/* Şifre Alanı (Reset modunda gizli) */}
          {!isResetMode && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium opacity-70">Şifre</label>
                {!isSignUp && (
                  <button 
                    onClick={() => { setIsResetMode(true); setLoginInput(''); }}
                    className="text-xs text-red-600 hover:underline font-bold"
                  >
                    Şifremi Unuttum?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600"
                placeholder="******"
              />
            </div>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors mt-4 shadow-lg shadow-red-600/20"
          >
            {loading ? 'İşleniyor...' : (
              isResetMode ? 'Sıfırlama Bağlantısı Gönder' : (isSignUp ? 'Kayıt Ol' : 'Giriş Yap')
            )}
          </button>

          <div className="text-center mt-4 text-sm text-gray-500">
            {isResetMode ? (
              <button 
                onClick={() => setIsResetMode(false)}
                className="text-gray-500 hover:text-black dark:hover:text-white font-bold"
              >
                ← Girişe Dön
              </button>
            ) : (
              <>
                {isSignUp ? 'Zaten hesabınız var mı?' : 'Hesabınız yok mu?'}
                <button 
                  onClick={() => { setIsSignUp(!isSignUp); setIsResetMode(false); }}
                  className="ml-2 text-red-600 hover:underline font-bold"
                >
                  {isSignUp ? 'Giriş Yap' : 'Hesap Oluştur'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}