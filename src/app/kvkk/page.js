'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function KVKKSayfasi() {
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 1,
      icon: '🏢',
      title: 'Veri Sorumlusu',
      content: `6698 sayılı KVKK uyarınca kişisel verileriniz;

Veri Sorumlusu: KitapLab
İletişim: iletisim@kitaplab.com

tarafından, aşağıda açıklanan kapsamda işlenmektedir.`
    },
    {
      id: 2,
      icon: '📋',
      title: 'Kişisel Veri Nedir?',
      content: `Kişisel veri; kimliği belirli veya belirlenebilir gerçek kişiye ilişkin her türlü bilgiyi ifade eder.

Platform üzerinde işlenebilecek kişisel verilere örnek:
• Ad, soyad
• Kullanıcı adı / takma ad
• E-posta adresi
• Profil fotoğrafı
• IP adresi
• Cihaz bilgileri
• Tarayıcı bilgileri
• Oturum kayıtları
• Mesajlaşma kayıtları
• Yorum ve etkileşim kayıtları
• Paylaşılan içeriklere ilişkin meta veriler
• Raporlama ve moderasyon kayıtları
• Yarışma, etkinlik ve rozet bilgileri`
    },
    {
      id: 3,
      icon: '📁',
      title: 'İşlenen Kişisel Veri Kategorileri',
      content: `Platform tarafından işlenebilecek kişisel veriler:

KİMLİK VERİLERİ
• Ad, soyad
• Kullanıcı adı

İLETİŞİM VERİLERİ
• E-posta adresi
• Bildirim tercihleri

KULLANICI İŞLEM VERİLERİ
• Üyelik oluşturma tarihi
• Giriş-çıkış logları
• Takip, beğeni, yorum, mesaj kayıtları
• İçerik paylaşım geçmişi

TEKNİK VE LOG VERİLERİ
• IP adresi
• Cihaz türü
• İşletim sistemi
• Tarayıcı bilgisi
• Çerez (cookie) kayıtları

İÇERİK VE ETKİLEŞİM VERİLERİ
• Paylaşılan kitaplar, bölümler, yazılar
• Yorumlar
• Panolar ve gönderiler
• Mesajlaşma içerikleri (gerektiğinde denetim amaçlı)

HUKUKİ VE GÜVENLİK VERİLERİ
• Raporlama kayıtları
• Moderasyon kararları
• İhlal kayıtları
• Talep ve şikâyet kayıtları`
    },
    {
      id: 4,
      icon: '🎯',
      title: 'Kişisel Verilerin İşlenme Amaçları',
      content: `Kişisel verileriniz, KVKK'nın 5. ve 6. maddelerinde belirtilen şartlara uygun olarak aşağıdaki amaçlarla işlenmektedir:

• Üyelik işlemlerinin gerçekleştirilmesi
• Kullanıcı hesabının oluşturulması ve yönetilmesi
• İçerik paylaşımı, görüntülenmesi ve etkileşimlerin sağlanması
• Yorum, mesajlaşma ve takip sistemlerinin çalıştırılması
• Topluluk kurallarının uygulanması
• Moderasyon ve güvenlik süreçlerinin yürütülmesi
• Kural ihlallerinin tespiti ve önlenmesi
• Platformun teknik altyapısının işletilmesi
• Hata tespiti, performans ölçümü ve iyileştirme
• Hukuki yükümlülüklerin yerine getirilmesi
• Yetkili kurum ve mercilerin taleplerinin karşılanması
• Kullanıcı deneyiminin geliştirilmesi
• Yarışma, etkinlik ve rozet süreçlerinin yürütülmesi
• Dolandırıcılık, spam ve kötüye kullanımın önlenmesi`
    },
    {
      id: 5,
      icon: '📥',
      title: 'Kişisel Verilerin Toplanma Yöntemleri',
      content: `Kişisel verileriniz şu yöntemlerle toplanmaktadır:

• Üyelik formları
• Profil düzenleme alanları
• İçerik paylaşımı
• Yorum ve mesajlaşma sistemleri
• Çerezler ve benzeri teknolojiler
• Otomatik loglama sistemleri
• Raporlama ve destek talepleri

Bu veriler otomatik veya kısmen otomatik yollarla toplanmaktadır.`
    },
    {
      id: 6,
      icon: '⚖️',
      title: 'Kişisel Verilerin Hukuki Sebepleri',
      content: `Kişisel verileriniz, KVKK'nın 5. maddesi uyarınca aşağıdaki hukuki sebeplere dayanarak işlenmektedir:

• Kanunlarda açıkça öngörülmesi
• Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması
• Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi
• Bir hakkın tesisi, kullanılması veya korunması
• Meşru menfaat kapsamında işlenmesi
• Açık rızanın bulunması (gereken hallerde)`
    },
    {
      id: 7,
      icon: '🔄',
      title: 'Kişisel Verilerin Aktarılması',
      content: `Kişisel verileriniz aşağıdaki taraflara aktarılabilir:

• Yetkili kamu kurum ve kuruluşlarına
• Hukuki yükümlülükler kapsamında adli ve idari mercilere
• Sunucu, barındırma (hosting), bulut hizmeti sağlayıcılarına
• Teknik destek ve güvenlik hizmeti sağlayıcılarına

Tüm aktarımlar KVKK'ya uygun şekilde ve gerekli güvenlik önlemleri alınarak yapılır.

Yurt dışına veri aktarımı söz konusu olması halinde, ilgili mevzuata uygunluk sağlanır.`
    },
    {
      id: 8,
      icon: '⏱️',
      title: 'Kişisel Verilerin Saklama Süresi',
      content: `Kişisel veriler şu sürelerde saklanır:

• İşleme amacının gerektirdiği süre boyunca
• İlgili mevzuatta öngörülen saklama süreleri kadar
• Hukuki yükümlülüklerin sona ermesine kadar

Süre sonunda kişisel veriler silinir, yok edilir veya anonim hale getirilir.`
    },
    {
      id: 9,
      icon: '🛡️',
      title: 'Veri Güvenliğine İlişkin Önlemler',
      content: `Platform, kişisel verilerin güvenliği için aşağıdaki önlemleri alır:

• Teknik ve idari tedbirler
• Yetkisiz erişim önlemleri
• Veri minimizasyonu prensibi
• Güvenli sunucu altyapısı
• Yetkilendirme ve erişim kontrolleri

Bu önlemler, verilerinizin korunması için sürekli güncellenir ve geliştirilir.`
    },
    {
      id: 10,
      icon: '✊',
      title: 'KVKK Kapsamında Kullanıcı Hakları',
      content: `KVKK'nın 11. maddesi uyarınca sahip olduğunuz haklar:

• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• İşlenmişse buna ilişkin bilgi talep etme
• Amacına uygun kullanılıp kullanılmadığını öğrenme
• Yurt içi / yurt dışı aktarılan üçüncü kişileri bilme
• Eksik veya yanlış işlenmişse düzeltilmesini isteme
• Silinmesini veya yok edilmesini isteme
• Otomatik sistemler sonucu aleyhe çıkan sonuçlara itiraz etme
• Kanuna aykırı işlem nedeniyle zararın giderilmesini talep etme

Bu haklarınızı kullanmak için başvuru yapabilirsiniz.`
    },
    {
      id: 11,
      icon: '📧',
      title: 'Başvuru Yöntemi',
      content: `KVKK kapsamındaki taleplerinizi şu yollarla iletebilirsiniz:

E-posta: iletisim@kitaplab.com
Platform içi destek sistemi

Talepleriniz, mevzuatta öngörülen süreler içinde (en geç 30 gün) değerlendirilerek sonuçlandırılır.

Başvurularınızda lütfen kimlik doğrulaması için gerekli bilgileri ekleyin.`
    },
    {
      id: 12,
      icon: '📅',
      title: 'Metnin Yürürlüğü',
      content: `Bu KVKK Aydınlatma Metni, Platform'da yayımlandığı tarihte yürürlüğe girer.

Platform, gerekli gördüğü durumlarda metni güncelleme hakkını saklı tutar.

Güncellemeler bu sayfada yayımlanır ve kullanıcılara bildirilir.`
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black py-12 md:py-20 px-4 md:px-6 transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-3 bg-white dark:bg-white/5 px-6 py-3 rounded-full border dark:border-white/10 mb-6 shadow-lg">
            <span className="text-2xl">🔒</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">6698 Sayılı Kanun</span>
          </div>
          
          <h1 className="text-3xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
            <span className="text-black dark:text-white">Kişisel Verilerin </span>
            <span className="text-blue-600">Korunması</span>
          </h1>
          
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Bu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, KitapLab ("Platform") tarafından, kişisel verileri işlenen gerçek kişileri bilgilendirmek amacıyla hazırlanmıştır.
          </p>

          <div className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full">
            <span>🛡️</span>
            <span className="font-bold">Platform, kullanıcıların gizliliğine ve veri mahremiyetine azami önem verir</span>
          </div>
        </div>

        {/* HIZLI ERİŞİM KARTLARI */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <button
            onClick={() => setActiveSection(10)}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-900/30 hover:scale-105 transition-transform text-left"
          >
            <div className="text-3xl mb-3">✊</div>
            <h3 className="text-sm font-black mb-2 dark:text-white">Haklarınız</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">KVKK kapsamında sahip olduğunuz hakları öğrenin</p>
          </button>

          <button
            onClick={() => setActiveSection(11)}
            className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-900/30 hover:scale-105 transition-transform text-left"
          >
            <div className="text-3xl mb-3">📧</div>
            <h3 className="text-sm font-black mb-2 dark:text-white">Başvuru</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Veri talepleriniz için nasıl başvuru yapacağınızı öğrenin</p>
          </button>

          <button
            onClick={() => setActiveSection(9)}
            className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6 rounded-2xl border-2 border-green-200 dark:border-green-900/30 hover:scale-105 transition-transform text-left"
          >
            <div className="text-3xl mb-3">🛡️</div>
            <h3 className="text-sm font-black mb-2 dark:text-white">Güvenlik</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Verilerinizi nasıl koruduğumuzu öğrenin</p>
          </button>
        </div>

        {/* MADDE LİSTESİ */}
        <div className="space-y-4 mb-12">
          {sections.map(section => (
            <div 
              key={section.id}
              className="bg-white dark:bg-white/5 border dark:border-white/10 rounded-2xl md:rounded-3xl overflow-hidden transition-all hover:shadow-xl"
            >
              <button
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                className="w-full p-6 md:p-8 flex items-center justify-between text-left transition-all hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600/10 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shrink-0">
                    {section.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Madde {section.id}</span>
                    </div>
                    <h2 className="text-lg md:text-xl font-black dark:text-white">{section.title}</h2>
                  </div>
                </div>
                <div className={`text-2xl md:text-3xl transition-transform ${activeSection === section.id ? 'rotate-180' : ''}`}>
                  ⌄
                </div>
              </button>

              {activeSection === section.id && (
                <div className="px-6 md:px-8 pb-6 md:pb-8 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="pt-4 border-t dark:border-white/10">
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ÖNEMLİ BİLGİLENDİRME */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-8 md:p-10 rounded-3xl md:rounded-[3rem] text-white text-center shadow-2xl mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h3 className="text-2xl md:text-3xl font-black mb-4">Verileriniz Güvende</h3>
          <p className="text-sm md:text-base opacity-90 max-w-2xl mx-auto leading-relaxed mb-6">
            KitapLab olarak, kişisel verilerinizin korunması ve gizliliğinizin sağlanması en önemli önceliğimizdir. KVKK kapsamında tüm yasal yükümlülüklerimizi eksiksiz yerine getiriyoruz.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/iletisim"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-full text-xs font-black uppercase hover:scale-105 transition-transform shadow-lg"
            >
              <span>İletişime Geç</span>
              <span>→</span>
            </Link>
            <Link 
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-6 py-3 rounded-full text-xs font-black uppercase hover:scale-105 transition-transform"
            >
              <span>Ana Sayfaya Dön</span>
            </Link>
          </div>
        </div>

        {/* FOOTER BİLGİ */}
        <div className="text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500 dark:text-gray-600">
            <Link href="/kurallar" className="hover:text-blue-600 transition-colors">Topluluk Kuralları</Link>
            <span>•</span>
            <Link href="/iletisim" className="hover:text-blue-600 transition-colors">Destek ve İletişim</Link>
            <span>•</span>
            <span>Son güncelleme: Aralık 2024</span>
          </div>
          
          <p className="text-xs text-gray-400 dark:text-gray-600 max-w-xl mx-auto">
            Bu metin 6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca hazırlanmıştır. Sorularınız için {' '}
            <a href="mailto:iletisim@kitaplab.com" className="text-blue-600 hover:underline font-bold">
              iletisim@kitaplab.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}