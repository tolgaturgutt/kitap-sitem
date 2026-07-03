'use client'; 

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// MODAL BİLEŞENİ
function DocumentModal({ isOpen, onClose, title, content }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800 relative">
        <div className="p-5 border-b dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
          <h2 className="text-xl font-black text-red-600 uppercase tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-red-600 hover:text-white transition-colors font-bold"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-line">
          {content}
        </div>

        <div className="p-5 border-t dark:border-gray-800 bg-gray-50 dark:bg-black/20 rounded-b-2xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Okudum, Anladım
          </button>
        </div>
      </div>
    </div>
  );
}

// ANA GİRİŞ SAYFASI
export default function GirisSayfasi() {
  const [loginInput, setLoginInput] = useState(''); 
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); 
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showKvkk, setShowKvkk] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const isEmail = (text) => text.includes('@');

  // 🔒 GÜVENLİK: Input sanitization helper
  const sanitizeInput = (input) => {
    if (!input) return '';
    return input.trim().slice(0, 255); // Max 255 karakter
  };

  // ŞİFRE SIFIRLAMA
 // ŞİFRE SIFIRLAMA (Sadece E-posta)
  async function handleResetPassword() {
    const cleanInput = sanitizeInput(loginInput);
    
    // 👇 Sadece E-posta formatı kontrolü yapıyoruz
    if (!cleanInput || !isEmail(cleanInput)) {
      return toast.error('Lütfen geçerli bir e-posta adresi giriniz.');
    }
    
    setLoading(true);
    
    try {
      // Direkt girilen e-postaya gönderiyoruz
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanInput, {
        redirectTo: `${window.location.origin}/sifre-yenile`,
      });

      if (resetError) {
        // Güvenlik için bazen hata detayını gizlemek gerekebilir ama şimdilik gösterelim
        throw resetError;
      }
      
      toast.success('Sıfırlama bağlantısı e-postanıza gönderildi! 📧');
      
      // İşlem bitince giriş ekranına atıp temizleyelim
      setIsResetMode(false);
      setLoginInput('');
      
    } catch (error) {
      console.error(error);
      // Kullanıcı bulunamadı hatasını çok açık vermemek güvenlik açısından daha iyidir
      // Ama supabase genelde "rate limit" dışında hata dönmez (security through obscurity)
      toast.success('Eğer kayıtlıysa e-postanıza bağlantı gönderildi.'); 
    } finally {
      setLoading(false);
    }
  }
  // ANA İŞLEM (GİRİŞ veya KAYIT)
  async function handleAuth() {
    if (isResetMode) return handleResetPassword();

    const cleanLogin = sanitizeInput(loginInput);
    const cleanPassword = password?.trim();
    const cleanUsername = sanitizeInput(username);
    const cleanFullName = sanitizeInput(fullName);

    if (!cleanLogin || !cleanPassword) {
      return toast.error('Lütfen tüm alanları doldurunuz.');
    }

    // KAYIT OLMA
    if (isSignUp) {
      if (!cleanUsername || !cleanFullName) {
        return toast.error('Tüm alanlar zorunludur.');
      }
      if (!agreed) {
        return toast.error('Lütfen kuralları okuyup onaylayınız.');
      }
      if (!isEmail(cleanLogin)) {
        return toast.error('Geçerli bir e-posta giriniz.');
      }

      // ✅ Boşluk ve karakter kontrolü
      const finalUsername = cleanUsername.toLowerCase().replace(/\s+/g, '');
      if (!/^[a-z0-9_-]{3,20}$/.test(finalUsername)) {
        return toast.error('Kullanıcı adı 3-20 karakter arası, boşluksuz, sadece harf, rakam, - ve _ içerebilir.');
      }

      setLoading(true);

      try {
        // ✅ 1. ADIM: USERNAME KONTROL ET (Auth'dan önce!)
        const { data: existingUsername, error: usernameCheckError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', finalUsername)
          .maybeSingle();

        if (existingUsername) {
          throw new Error('Bu kullanıcı adı zaten kullanımda. Lütfen farklı bir tane deneyin.');
        }

        // ✅ 2. ADIM: EMAIL KONTROL ET (Profiles tablosunda)
        const { data: existingEmail, error: emailCheckError } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', cleanLogin.toLowerCase())
          .maybeSingle();

        if (existingEmail) {
          throw new Error('Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.');
        }

        // ✅ 3. ADIM: AUTH KAYIT İŞLEMİ
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: cleanLogin.toLowerCase(),
          password: cleanPassword,
          options: { 
            data: { 
              username: finalUsername, 
              full_name: cleanFullName 
            } 
          },
        });

        if (signUpError) {
          // Auth'da hata varsa, kullanıcıya net bilgi ver
          if (signUpError.message.includes('already registered')) {
            throw new Error('Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.');
          }
          throw signUpError;
        }

        if (!authData.user) {
          throw new Error('Kayıt oluşturulamadı. Lütfen tekrar deneyin.');
        }

        // ✅ 4. ADIM: PROFILES TABLOSUNA EKLE
        const user = authData.user;
        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          username: finalUsername,
          full_name: cleanFullName,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUsername}`,
        });

        if (profileError) {
          // Eğer profile oluşturulamazsa, durumu logla (ama auth'daki kullanıcı kalacak)
          console.error('Profile oluşturulamadı:', profileError);
          throw new Error('Profil oluşturulamadı. Lütfen destek ile iletişime geçin.');
        }

        

       // ✅ 6. ADIM: BAŞARILI KAYIT - MAIL ONAYI BEKLEME MODU
// Kullanıcıyı hemen içeri almıyoruz, cookie basmıyoruz.
toast.success('Kayıt oluşturuldu! 🚀', { duration: 4000 });
toast('Lütfen mail kutunuza (Spam dahil) gelen onay linkine tıklayarak hesabınızı doğrulayın.', {
  icon: '✉️',
  duration: 8000, // Mesaj ekranda uzun kalsın
  style: {
    border: '1px solid #713200',
    padding: '16px',
    color: '#713200',
  },
});

// Formu temizle ve "Giriş Yap" moduna döndür ki adam maili onaylayıp gelince giriş yapsın
setIsSignUp(false);
setLoginInput('');
setPassword('');
setAgreed(false);

      } catch (error) {
        toast.error(error.message || 'Bir hata oluştu.');
      } finally {
        setLoading(false);
      }

    } else {
      // GİRİŞ YAPMA
      setLoading(true);
      try {
        let finalEmail = cleanLogin;
        if (!isEmail(cleanLogin)) {
          // ✅ Kullanıcı adını temizle (boşluk varsa sil)
          const cleanedUsername = cleanLogin.toLowerCase().replace(/\s+/g, '');
          
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', cleanedUsername)
            .single();

          if (profileError || !data) throw new Error('Hesap bulunamadı.');
          finalEmail = data.email;
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: finalEmail,
          password: cleanPassword,
        });

        if (error) {
          console.log(error.message); // Hata mesajını konsolda görmek için (geliştirirken kalsın)
          
          // Eğer Supabase "Email not confirmed" derse özel mesaj ver
          if (error.message.includes("Email not confirmed")) {
            throw new Error('Giriş yapabilmek için lütfen mailinize gelen onay linkine tıklayınız. 📧');
          }

          // Diğer durumlarda (şifre yanlışsa vs.)
          throw new Error('Giriş bilgileri hatalı.');
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_banned')
          .eq('id', data.user.id)
          .single();

        if (profile?.is_banned) {
          await supabase.auth.signOut();
          throw new Error('Hesabınız askıya alınmıştır.');
        }

        document.cookie = "site_erisim=acik; path=/; max-age=604800; SameSite=Strict";
        toast.success('Giriş başarılı.');
        
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);

      } catch (error) {
        toast.error(error.message || 'Bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-black dark:text-white p-6">
      <DocumentModal 
        isOpen={showKvkk} 
        onClose={() => setShowKvkk(false)} 
        title="KVKK AYDINLATMA METNİ" 
        content={FULL_KVKK_TEXT} 
      />
      <DocumentModal 
        isOpen={showRules} 
        onClose={() => setShowRules(false)} 
        title="TOPLULUK SÖZLEŞMESİ" 
        content={FULL_RULES_TEXT} 
      />

      <div className="w-full max-w-md bg-gray-50 dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl">
        <h1 className="text-3xl font-black mb-2 text-center tracking-tight">
          {isResetMode ? 'ŞİFREMİ UNUTTUM' : (isSignUp ? 'KAYIT OL' : 'GİRİŞ YAP')}
        </h1>
        <p className="text-gray-500 mb-8 text-sm text-center font-medium">
          {isResetMode ? 'Bilgilerinizi girerek şifrenizi sıfırlayın.' : (isSignUp ? 'Aramıza katıl, yazmaya başla.' : 'Hesabınıza giriş yapın.')}
        </p>

        <div className="space-y-4">
          
          {isSignUp && !isResetMode && (
            <>
              <div>
                <label className="block text-xs font-bold mb-1 opacity-60 uppercase">Ad Soyad</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                  className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                  placeholder="Adınız Soyadınız"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 opacity-60 uppercase">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    // ✅ Boşlukları otomatik sil, sadece geçerli karakterler
                    const cleaned = e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '') // Boşlukları sil
                      .replace(/[^a-z0-9_-]/g, ''); // Sadece harf, rakam, - ve _
                    setUsername(cleaned);
                  }}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_-]+"
                  className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                  placeholder="kullaniciadi"
                />
                <p className="text-xs text-gray-500 mt-1">3-20 karakter, boşluksuz, sadece harf, rakam, - ve _</p>
              </div>
            </>
          )}

         <div>
            <label className="block text-xs font-bold mb-1 opacity-60 uppercase">
              {/* 👇 Eğer Şifre Sıfırlama VEYA Kayıt ise "E-posta" yazsın. Sadece Giriş'te ikisi de olur. */}
              {isResetMode || isSignUp ? 'E-posta Adresi' : 'E-posta veya Kullanıcı Adı'}
            </label>
            <input
              type={isResetMode || isSignUp ? "email" : "text"} // Telefondaki klavye @ işaretli açılsın
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              maxLength={255}
              className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
              // 👇 Placeholder'ı da duruma göre değiştirdik
              placeholder={isResetMode || isSignUp ? "mail@ornek.com" : "Kullanıcı adı veya e-posta"}
            />
          </div>
          {!isResetMode && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold opacity-60 uppercase">Şifre</label>
                {!isSignUp && (
                  <button onClick={() => { setIsResetMode(true); setLoginInput(''); }} className="text-xs text-red-600 hover:underline font-bold">
                    Unuttum?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                maxLength={100}
                className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                placeholder="******"
              />
            </div>
          )}

          {isSignUp && !isResetMode && (
            <div className="flex items-start gap-3 p-2">
              <input 
                type="checkbox" 
                id="agreed"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 accent-red-600 cursor-pointer"
              />
              <label htmlFor="agreed" className="text-xs text-gray-500 cursor-pointer select-none">
                <span className="font-bold text-red-600 hover:underline" onClick={(e) => { e.preventDefault(); setShowRules(true); }}>
                  Topluluk Kuralları
                </span>
                {' ve '}
                <span className="font-bold text-red-600 hover:underline" onClick={(e) => { e.preventDefault(); setShowKvkk(true); }}>
                  KVKK Metni
                </span>
                'ni okudum, anladım ve kabul ediyorum.
              </label>
            </div>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'İşleniyor...' : (isResetMode ? 'Bağlantı Gönder' : (isSignUp ? 'Kayıt Ol' : 'Giriş Yap'))}
          </button>

          <div className="text-center mt-6 text-xs font-bold text-gray-500">
            {isResetMode ? (
              <button onClick={() => setIsResetMode(false)} className="hover:text-black dark:hover:text-white">
                ← Girişe Dön
              </button>
            ) : (
              <>
                {isSignUp ? 'Zaten hesabınız var mı?' : 'Hesabınız yok mu?'}
                <button 
                  onClick={() => { setIsSignUp(!isSignUp); setIsResetMode(false); setAgreed(false); }}
                  className="ml-2 text-red-600 hover:underline"
                >
                  {isSignUp ? 'Giriş Yap' : 'Kayıt Ol'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const FULL_KVKK_TEXT = `KİŞİSEL VERİLERİN KORUNMASI VE AYDINLATMA METNİ
(6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında)

Bu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, KitapLab ("Platform") tarafından, kişisel verileri işlenen gerçek kişileri bilgilendirmek amacıyla hazırlanmıştır.

Platform; kullanıcıların gizliliğine, kişisel verilerinin güvenliğine ve veri mahremiyetine azami önem verir.

1. VERİ SORUMLUSU
6698 sayılı KVKK uyarınca kişisel verileriniz;
Veri Sorumlusu: KitapLab [iletisim@kitaplab.com] tarafından, aşağıda açıklanan kapsamda işlenmektedir.

2. KİŞİSEL VERİ NEDİR?
Kişisel veri; kimliği belirli veya belirlenebilir gerçek kişiye ilişkin her türlü bilgiyi ifade eder.
Bu kapsamda Platform üzerinde işlenebilecek kişisel verilere örnek olarak şunlar verilebilir:
Ad, soyad, Kullanıcı adı / takma ad, E-posta adresi, Profil fotoğrafı, IP adresi, Cihaz bilgileri, Tarayıcı bilgileri, Oturum kayıtları, Mesajlaşma kayıtları, Yorum ve etkileşim kayıtları.

3. İŞLENEN KİŞİSEL VERİ KATEGORİLERİ
3.1. Kimlik Verileri: Ad, soyad, Kullanıcı adı.
3.2. İletişim Verileri: E-posta adresi, Bildirim tercihleri.
3.3. Kullanıcı İşlem Verileri: Üyelik oluşturma tarihi, Giriş-çıkış logları, Takip, beğeni, yorum, mesaj kayıtları.
3.4. Teknik ve Log Verileri: IP adresi, Cihaz türü, İşletim sistemi, Tarayıcı bilgisi, Çerez kayıtları.
3.5. İçerik ve Etkileşim Verileri: Paylaşılan kitaplar, bölümler, yorumlar, panolar, mesajlar.
3.6. Hukuki ve Güvenlik Verileri: Raporlama kayıtları, Moderasyon kararları, İhlal kayıtları.

4. KİŞİSEL VERİLERİN İŞLENME AMAÇLARI
Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
Üyelik işlemlerinin gerçekleştirilmesi, Kullanıcı hesabının yönetilmesi, İçerik paylaşımı ve etkileşimlerin sağlanması, Topluluk kurallarının uygulanması, Güvenlik süreçlerinin yürütülmesi, Hukuki yükümlülüklerin yerine getirilmesi.

5. KİŞİSEL VERİLERİN TOPLANMA YÖNTEMLERİ
Kişisel verileriniz; Üyelik formları, Profil düzenleme alanları, İçerik paylaşımı, Çerezler ve Otomatik loglama sistemleri aracılığıyla toplanmaktadır.

6. KİŞİSEL VERİLERİN HUKUKİ SEBEPLERİ
Verileriniz; Kanunlarda öngörülmesi, Sözleşmenin ifası, Hukuki yükümlülük, Meşru menfaat ve Açık rıza sebeplerine dayanarak işlenir.

7. KİŞİSEL VERİLERİN AKTARILMASI
Kişisel verileriniz; Yetkili kamu kurumlarına, Hukuki yükümlülükler kapsamında adli mercilere, Sunucu ve barındırma sağlayıcılarına aktarılabilir.

8. KİŞİSEL VERİLERİN SAKLANMA SÜRESİ
Kişisel veriler, işleme amacının gerektirdiği süre boyunca veya mevzuatta öngörülen süreler kadar saklanır. Süre sonunda silinir veya anonim hale getirilir.

9. VERİ GÜVENLİĞİNE İLİŞKİN ÖNLEMLER
Platform, verilerin güvenliği için teknik ve idari tedbirleri, yetkisiz erişim önlemlerini ve güvenli sunucu altyapısını uygular.

10. KVKK KAPSAMINDA KULLANICI HAKLARI
KVKK'nın 11. maddesi uyarınca kullanıcılar; Verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme haklarına sahiptir.

11. BAŞVURU YÖNTEMİ
Taleplerinizi [iletisim@kitaplab.com] adresi veya Platform içi destek sistemi üzerinden iletebilirsiniz.`;

const FULL_RULES_TEXT = `
TOPLULUK SÖZLEŞMESİ VE TOPLULUK KURALLARI

Bu platform; yazarlara üretim alanı, okurlara keşif alanı sunan, yaratıcı içeriklerin paylaşıldığı bir okuma—yazma topluluğudur. Amacımız, herkesin kendini güvende hissedebileceği bir ortam oluşturmaktır.

1. TANIMLAR
Platform: Web ve mobil uygulama.
Kullanıcı: Hizmetlerden yararlanan kişi.
İçerik: Bölüm, kitap, yorum, mesaj vb. tüm üretimler.
Yaptırım: Uyarıdan hesap kapatmaya kadar giden cezalar.

2. TOPLULUĞUN TEMEL İLKELERİ
Saygı, Güvenlik, Emeğe saygı, İfade özgürlüğü, Adaletli moderasyon ve Topluluk ruhu (linç kültürüne hayır) esastır.

3. HESAP VE DAVRANIM SORUMLULUĞU
Kullanıcılar doğru bilgi vermekle yükümlüdür. Yan hesaplarla manipülasyon yapmak yasaktır. Başkasının kimliğine bürünmek yasaktır. İletişimde saygılı dil esastır.

4. TACİZ VE ZORBALIGA SIFIR TOLERANS
Kişisel hakaret, tehdit, stalking (ısrarlı takip), linç çağrısı, cinsel taciz ve şantaj kesinlikle yasaktır.

5. NEFRET SÖYLEMİ VE AYRIMCILIK
Irk, din, cinsiyet, yönelim gibi özellikler üzerinden ayrımcılık yapmak ve nefret söyleminde bulunmak yasaktır.

6. İÇERİK PAYLAŞIM KURALLARI
Şiddet, kan, taciz, ölüm gibi temalar içeren içerikler mutlaka ETİKETLENMELİDİR.
Yasak İçerikler: Çocuk istismarı, Rıza dışı içerik övgüsü, Doxxing (ifşa), İntihar teşviki, Terör propagandası.

7. YORUM VE ELEŞTİRİ KÜLTÜRÜ
Eleştiri serbesttir, ancak saldırı yasaktır. Spoiler içeren yorumlar işaretlenmelidir. Spam ve reklam yasaktır.

8. MESAJLAŞMA VE TAKİP
Kullanıcı istemediği halde ısrarla mesaj atmak taciz sayılır. Cinsel içerikli mesajlar yasaktır.

9. PANO VE YARIŞMALAR
Panolarda linç yasaktır. Yarışmalarda hile (bot, sahte hesap) yasaktır.

10. TELİF HAKLARI
İçeriklerin telif hakkı üretene aittir. İntihal ve içerik çalmak yasaktır.

11. GİZLİLİK VE GÜVENLİK
Kullanıcılar birbirlerinin kişisel bilgilerini (adres, telefon vb.) paylaşamaz.

12. RAPORLAMA SİSTEMİ
Yalan raporlama veya raporlama tehdidi yasaktır.

13. YAPTIRIMLAR
İhlal durumunda: İçerik uyarısı, Resmi uyarı, Geçici kısıtlama, Hesabı askıya alma veya Kalıcı kapatma uygulanabilir.

14. KABUL BEYANI
Platformu kullanan herkes, bu kuralları kabul etmiş sayılır.
`;
// deneme