'use client'; 

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

// ==========================================
// 1. MODAL BİLEŞENİ (PENCERE)
// ==========================================
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

// ==========================================
// 2. ANA GİRİŞ SAYFASI
// ==========================================
export default function GirisSayfasi() {
  const [loginInput, setLoginInput] = useState(''); 
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); 
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showKvkk, setShowKvkk] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const isEmail = (text) => text.includes('@');

  // ŞİFRE SIFIRLAMA
  async function handleResetPassword() {
    if (!loginInput) return toast.error('E-posta veya kullanıcı adı giriniz.');
    setLoading(true);
    
    let targetEmail = loginInput;
    if (!isEmail(loginInput)) {
      const { data } = await supabase.from('profiles').select('email').ilike('username', loginInput).single();
      if (!data) {
        setLoading(false);
        return toast.error('Kullanıcı bulunamadı.');
      }
      targetEmail = data.email;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/sifre-yenile`,
    });

    if (error) toast.error(error.message);
    else {
      toast.success('Sıfırlama bağlantısı gönderildi.');
      setIsResetMode(false);
    }
    setLoading(false);
  }

  // KAYIT İŞLEMİ - DÜZELTİLMİŞ VERSİYON
  async function handleSignUp() {
    if (!username || !fullName || !inviteCode) {
      return toast.error('Tüm alanlar ve Davetiye Kodu zorunludur.');
    }
    if (!agreed) {
      return toast.error('Lütfen kuralları okuyup onaylayınız.');
    }
    if (!isEmail(loginInput)) {
      return toast.error('Geçerli bir e-posta giriniz.');
    }

    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = loginInput.trim().toLowerCase();

      // 1. KULLANICI ADI KONTROLÜ
      console.log('Kullanıcı adı kontrol ediliyor:', cleanUsername);
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingUsername) {
        setLoading(false);
        return toast.error('Bu kullanıcı adı zaten alınmış.');
      }

      // 2. E-POSTA KONTROLÜ
      console.log('E-posta kontrol ediliyor:', cleanEmail);
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('email')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingEmail) {
        setLoading(false);
        return toast.error('Bu e-posta adresi zaten kayıtlı.');
      }

      // 3. DAVETİYE KODU KONTROLÜ
      console.log('Davetiye kodu kontrol ediliyor:', inviteCode);
      const { data: bilet, error: biletError } = await supabase
        .from('davetiyeler')
        .select('*')
        .eq('kod', inviteCode.trim())
        .eq('kullanildi', false)
        .maybeSingle();

      if (biletError) {
        console.error('Davetiye sorgu hatası:', biletError);
        setLoading(false);
        return toast.error('Davetiye kontrolünde hata oluştu.');
      }

      if (!bilet) {
        setLoading(false);
        return toast.error('Geçersiz veya kullanılmış davetiye kodu!');
      }

      // 4. ÖNCELİKLE PROFİL OLUŞTUR (Trigger sorununu bypass et)
      console.log('Geçici kullanıcı ID oluşturuluyor...');
      const tempUserId = crypto.randomUUID();
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: tempUserId,
          username: cleanUsername,
          full_name: fullName.trim(),
          email: cleanEmail,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`,
        });

      if (profileError) {
        console.error('Profil oluşturma hatası:', profileError);
        setLoading(false);
        return toast.error('Profil oluşturulamadı: ' + profileError.message);
      }

      console.log('Profil oluşturuldu, şimdi auth kaydı yapılıyor...');

      // 5. AUTH KAYIT (email_confirm_disabled ile)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: fullName.trim(),
          },
          emailRedirectTo: undefined, // Email onayı kapalı
        },
      });

      if (signUpError) {
        console.error('Kayıt hatası:', signUpError);
        // Profili geri sil
        await supabase.from('profiles').delete().eq('id', tempUserId);
        setLoading(false);
        return toast.error("Kayıt hatası: " + signUpError.message);
      }

      if (!authData.user) {
        await supabase.from('profiles').delete().eq('id', tempUserId);
        setLoading(false);
        return toast.error('Kullanıcı oluşturulamadı.');
      }

      console.log('Auth kullanıcı oluşturuldu:', authData.user.id);

      // 6. PROFİL ID'Sİ GÜNCELLE
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ id: authData.user.id })
        .eq('id', tempUserId);

      if (updateError) {
        console.error('Profil ID güncelleme hatası:', updateError);
        // Temizlik yap
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from('profiles').delete().eq('id', tempUserId);
        setLoading(false);
        return toast.error('Profil güncellenemedi.');
      }

      console.log('Profil ID güncellendi');

      // 7. KİTAPLAB'I TAKİP ET (varsa)
      try {
        console.log('KitapLab takip ediliyor...');
        const { data: kitaplab } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', 'kitaplab')
          .maybeSingle();

        if (kitaplab) {
          await supabase
            .from('followers')
            .insert({
              follower_id: authData.user.id,
              following_id: kitaplab.id,
            })
            .select()
            .maybeSingle();
        }
      } catch (followErr) {
        console.error('KitapLab takip hatası (göz ardı edildi):', followErr);
      }

      // 8. DAVETİYEYİ GEÇERSİZ KIL
      console.log('Davetiye geçersiz kılınıyor...');
      await supabase
        .from('davetiyeler')
        .update({ kullanildi: true })
        .eq('id', bilet.id);

      // 9. ERİŞİM DAMGASI
      document.cookie = "site_erisim=acik; path=/; max-age=604800";

      toast.success('Kayıt başarılı! Yönlendiriliyorsunuz...');
      
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);

    } catch (err) {
      console.error('Beklenmedik hata:', err);
      setLoading(false);
      toast.error("Beklenmedik bir hata oluştu: " + err.message);
    }
  }

  // GİRİŞ İŞLEMİ
  async function handleSignIn() {
    setLoading(true);
    let finalEmail = loginInput;

    if (!isEmail(loginInput)) {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', loginInput)
        .single();
        
      if (!data) {
        setLoading(false);
        return toast.error('Hesap bulunamadı.');
      }
      finalEmail = data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password,
    });

    if (error) {
      setLoading(false);
      return toast.error('Giriş bilgileri hatalı.');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', data.user.id)
      .single();

    if (profile?.is_banned) {
      await supabase.auth.signOut();
      setLoading(false);
      return toast.error('Hesabınız askıya alınmıştır.');
    }

    document.cookie = "site_erisim=acik; path=/; max-age=604800";

    toast.success('Giriş başarılı.');
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 1000);
  }

  // ANA İŞLEM YÖNLENDİRİCİ
  async function handleAuth() {
    if (isResetMode) return handleResetPassword();
    if (!loginInput || !password) return toast.error('Lütfen tüm alanları doldurunuz.');
    
    if (isSignUp) {
      return handleSignUp();
    } else {
      return handleSignIn();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-black dark:text-white p-6">
      <Toaster position="top-right" />

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
          {isResetMode ? 'ŞİFREMİ UNUTTUM' : (isSignUp ? 'DAVETİYE İLE KAYIT' : 'GİRİŞ YAP')}
        </h1>
        <p className="text-gray-500 mb-8 text-sm text-center font-medium">
          {isResetMode ? 'Bilgilerinizi girerek şifrenizi sıfırlayın.' : (isSignUp ? 'Kodu gir, aramıza katıl.' : 'Hesabınıza giriş yapın.')}
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
                  className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                  placeholder="Adınız Soyadınız"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 opacity-60 uppercase">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                  placeholder="kullaniciadi"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-bold mb-1 text-red-600 uppercase">Davetiye Kodu (Zorunlu)</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono tracking-widest text-center font-bold"
                  placeholder="KODU BURAYA YAZ"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold mb-1 opacity-60 uppercase">
              {isSignUp && !isResetMode ? 'E-posta Adresi' : 'E-posta veya Kullanıcı Adı'}
            </label>
            <input
              type="text" 
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="w-full p-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
              placeholder={isSignUp ? "mail@ornek.com" : "Giriş bilgisi"}
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
                  onClick={() => { setIsSignUp(!isSignUp); setIsResetMode(false); setInviteCode(''); setAgreed(false); }}
                  className="ml-2 text-red-600 hover:underline"
                >
                  {isSignUp ? 'Giriş Yap' : 'Davetiye ile Kayıt Ol'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const FULL_KVKK_TEXT = `
KİŞİSEL VERİLERİN KORUNMASI VE AYDINLATMA METNİ
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
Taleplerinizi [iletisim@kitaplab.com] adresi veya Platform içi destek sistemi üzerinden iletebilirsiniz.
`;

const FULL_RULES_TEXT = `
TOPLULUK SÖZLEŞMESİ VE TOPLULUK KURALLAR

Bu platform; yazarlara üretim alanı, okurlara keşif alanı sunan, yaratıcı içeriklerin paylaşıldığı bir okuma—yazma topluluğudur. Amacımız, herkesin kendini güvende hissedebileceği bir ortam oluşturmaktır.

1. TANIMLAR
Platform: Web ve mobil uygulama.
Kullanıcı: Hizmetlerden yararlanan kişi.
İçerik: Bölüm, kitap, yorum, mesaj vb. tüm üretimler.
Yaptırım: Uyarıdan hesap kapatmaya kadar giden cezalar.

2. TOPLULUĞUN TEMEL İLKELERİ
Saygı, Güvenlik, Emeğe saygı, İfade özgürlüğü, Adaletli moderasyon ve Topluluk ruhu (linç kültürüne hayır) esastır.

3. HESAP VE DAVRANIŞ SORUMLULUĞU
Kullanıcılar doğru bilgi vermekle yükümlüdür. Yan hesaplarla manipülasyon yapmak yasaktır. Başkasının kimliğine bürünmek yasaktır. İletişimde saygılı dil esastır.

4. TACİZ VE ZORBALĞA SIFIR TOLERANS
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
İhlal durumunda: İçerik uyarısı, Resmî uyarı, Geçici kısıtlama, Hesabı askıya alma veya Kalıcı kapatma uygulanabilir.

14. KABUL BEYANI
Platformu kullanan herkes, bu kuralları kabul etmiş sayılır.
`;