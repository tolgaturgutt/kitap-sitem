'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ToplulukKurallari() {
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 1,
      icon: '📋',
      title: 'Tanımlar',
      content: `Platform, Kullanıcı, Yazar, Okur, İçerik, Moderasyon, Rapor ve Yaptırım gibi temel kavramların tanımları bu bölümde yer alır. Bu terimler, sözleşme boyunca kullanılır ve topluluk kurallarının temelini oluşturur.`
    },
    {
      id: 2,
      icon: '🤝',
      title: 'Temel İlkeler',
      content: `• Saygı: Kimse, kimseyi küçük düşürmek için burada değildir.
• Güvenlik: Kullanıcıların kendini tehdit altında hissetmediği bir ortam esastır.
• Emeğe saygı: Üretilen içeriğin arkasında zaman, emek ve niyet vardır.
• İfade özgürlüğü + sınırlar: Kurgu ve eleştiri serbesttir; zarar verme, nefret, taciz ve istismar serbest değildir.
• Adaletli moderasyon: Kurallar herkes için geçerlidir.
• Topluluk ruhu: Kışkırtma, kutuplaştırma ve "linç kültürü" platformun ruhuna aykırıdır.`
    },
    {
      id: 3,
      icon: '👤',
      title: 'Hesap ve Kimlik Sorumluluğu',
      content: `Kullanıcılar hesap oluştururken doğru bilgi vermeli, hesap güvenliğini korumalı ve yan hesaplarla manipülasyon yapmamalıdır. Başkasının kimliğine bürünmek, taklit hesap açmak kesinlikle yasaktır. Tüm iletişimler saygılı, tehdit ve şantajsız olmalıdır.`
    },
    {
      id: 4,
      icon: '🚫',
      title: 'Taciz ve Zorbalığa Sıfır Tolerans',
      content: `Kişisel hakaret, tehdit, ısrarla mesaj atma (stalking), toplu saldırı/linç çağrısı, cinsel taciz, manipülasyon ve şantaj kesinlikle yasaktır. "Kaba eleştiri" ile "taciz" aynı şey değildir; ancak eleştiri bir kişiye saldırıya dönüştüğünde taciz sayılır.`
    },
    {
      id: 5,
      icon: '❌',
      title: 'Nefret Söylemi ve Ayrımcılık',
      content: `Bir grubu aşağılayan, şeytanlaştıran ifadeler; ırk, etnik köken, dil, din, mezhep, cinsiyet, engellilik, yaş, cinsel yönelim gibi özellikler üzerinden küçültme; genelleyici nefret dili ve ayrımcı küfürler kesinlikle yasaktır.`
    },
    {
      id: 6,
      icon: '📝',
      title: 'İçerik Paylaşım Kuralları',
      content: `Platform kurguya alan açar ancak bazı içerikler topluluk güvenliğini ihlal ediyorsa kaldırılabilir. Yazarlar doğru etiketleme yapmalıdır (şiddet, taciz, 18+ vb.). 

YASAK İÇERİKLER: Çocuk istismarı, LGBTQ+ içeren içerikler, rıza dışı cinsel içerik, doxxing, intihar teşviki, terör propagandası, yasa dışı faaliyet öğretimi, nefret suçu teşviki.`
    },
    {
      id: 7,
      icon: '💬',
      title: 'Yorum ve Eleştiri Kültürü',
      content: `"Bu bölümde tempo düştü" eleştiridir. "Sen yazma, rezilsin" saldırıdır. Spoiler içeren yorumlar etiketlenmeli, sürekli "Benim kitabıma gel" spamı yapılmamalı, kopyala-yapıştır yorumlar yasaktır.`
    },
    {
      id: 8,
      icon: '✉️',
      title: 'Mesajlaşma ve Takip',
      content: `Mesajlaşma özgürdür ancak kullanıcı istemediği halde ısrarla mesaj atmak taciz sayılır. "Gel konuşmazsan…" gibi manipülasyonlar, cinsel içerikli mesajlar ve rahatsız edici talepler doğrudan yaptırıma girer.`
    },
    {
      id: 9,
      icon: '📌',
      title: 'Pano, Etkinlik ve Yarışmalar',
      content: `Panolar topluluk odaklı kullanılmalı, kişi hedef alan panolar (ifşa, alay, linç) kaldırılır. Yarışmalarda hile yasaktır: bot, sahte hesap, oy satın alma, toplu manipülasyon. Jüri/puanlama sistemini manipüle etmeye yönelik baskı ve tehditler ağır ihlal sayılır.`
    },
    {
      id: 10,
      icon: '©️',
      title: 'Telif Hakları ve İçerik Sahipliği',
      content: `Paylaşılan içeriklerin telif hakkı kullanıcıya aittir. Başka bir eseri izinsiz yayımlamak, bölüm çalmak, karakter/evren kopyalayıp "benim" demek yasaktır. İntihal tespit edilirse içerik kaldırılır ve yaptırım uygulanır.`
    },
    {
      id: 11,
      icon: '🔒',
      title: 'Gizlilik ve Kişisel Veri',
      content: `Kullanıcılar birbirlerinin kişisel bilgilerini paylaşamaz (adres, telefon, okul, işyeri, kimlik vb.). Kişisel veri ifşası (doxxing) ağır ihlaldir ve ciddi yaptırımlara tabidir.`
    },
    {
      id: 12,
      icon: '⚠️',
      title: 'Raporlama Sisteminin Kötüye Kullanımı',
      content: `Rapor sistemi güvenlik içindir; silah değildir. Toplu rapor "saldırısı" planlamak, kasıtlı yalan raporlar, "Raporlarım seni uçururum" gibi tehdit yasaktır. Bu davranışlar tespit edilirse raporlayanlar yaptırıma uğrar.`
    },
    {
      id: 13,
      icon: '⚖️',
      title: 'Moderasyon Prensipleri',
      content: `Platform, bağlam, niyet ve etki, tekrar ve topluluk güvenliğini değerlendirerek moderasyon kararı verir. Gerekli gördüğünde içeriği kaldırabilir, kitabı görünmez kılabilir, etiket/uyarı ekleyebilir veya hesabı kısıtlayabilir.`
    },
    {
      id: 14,
      icon: '⚡',
      title: 'Yaptırımlar (Ceza Basamakları)',
      content: `1. İçerik uyarısı (etiket düzeltmesi)
2. Resmî uyarı (kayıt altına alınır)
3. Geçici kısıtlama (yorum, mesaj, içerik sınırı)
4. Geçici askıya alma (hesap engeli)
5. Kalıcı kapatma (platformdan çıkarma)

Ağır ihlallerde doğrudan kalıcı kapatma uygulanabilir.`
    },
    {
      id: 15,
      icon: '✅',
      title: 'Kabul Edilebilir Davranışlar',
      content: `• Yapıcı eleştiri: "Karakter motivasyonunu biraz daha açabilir misin?"
• Sınır koyma: "Bu tarz mesajlar istemiyorum, lütfen yazmayın."
• Uyarı etiketi kullanma: "Bu bölümde yoğun şiddet var (UYARI)."
• Tartışmayı nazikçe bitirme: "Bu konuda farklı düşünüyoruz, burada bırakıyorum."`
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black py-12 md:py-20 px-4 md:px-6 transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-3 bg-white dark:bg-white/5 px-6 py-3 rounded-full border dark:border-white/10 mb-6 shadow-lg">
            <span className="text-2xl">📜</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">Topluluk Sözleşmesi</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            <span className="text-black dark:text-white">Topluluk </span>
            <span className="text-red-600">Kuralları</span>
          </h1>
          
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Bu platform; yazarlara üretim alanı, okurlara keşif alanı sunan, yaratıcı içeriklerin paylaşıldığı bir okuma–yazma topluluğudur. Herkesin kendini güvende hissedebileceği; emek, saygı ve ifade özgürlüğünün dengeli biçimde korunduğu bir ortam oluşturmak için bu kurallar hazırlanmıştır.
          </p>

          <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 rounded-full">
            <span>⚠️</span>
            <span className="font-bold">Platformu kullanan herkes bu kuralları kabul etmiş sayılır</span>
          </div>
        </div>

        {/* KURALLAR LİSTESİ */}
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
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-red-600/10 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shrink-0">
                    {section.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Madde {section.id}</span>
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

        {/* ÖZEL VURGU KARTLARI */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-8 rounded-3xl border-2 border-red-200 dark:border-red-900/30">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-black mb-3 dark:text-white">Sıfır Tolerans</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Taciz, nefret söylemi, çocuk istismarı, doxxing ve LGBTQ+ içerikli paylaşımlar gibi ağır ihlallerde <strong>uyarı vermeden kalıcı hesap kapatma</strong> uygulanır.
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-8 rounded-3xl border-2 border-blue-200 dark:border-blue-900/30">
            <div className="text-4xl mb-4">⚖️</div>
            <h3 className="text-xl font-black mb-3 dark:text-white">Adil Moderasyon</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Kurallar <strong>herkes için</strong> geçerlidir. "Ünlü yazar, büyük takipçi" gibi statüler istisna yaratmaz. Bağlam, niyet ve topluluk güvenliği değerlendirilir.
            </p>
          </div>
        </div>

        {/* GÜNCELLEME BİLGİSİ */}
        <div className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-2xl md:rounded-3xl border dark:border-white/10 mb-8">
          <div className="flex items-start gap-4">
            <span className="text-2xl">📅</span>
            <div className="flex-1">
              <h3 className="text-sm font-black mb-2 dark:text-white uppercase tracking-widest">Sözleşmenin Güncellenmesi</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Platform, topluluk güvenliği, ürün geliştirme ve yasal gerekliliklere göre bu sözleşmeyi güncelleyebilir. Güncellenen metin platformda yayımlandığı andan itibaren geçerlidir.
              </p>
            </div>
          </div>
        </div>

        {/* KABUL BEYANI */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-8 md:p-10 rounded-3xl md:rounded-[3rem] text-white text-center shadow-2xl">
          <div className="text-5xl mb-4">✍️</div>
          <h3 className="text-2xl md:text-3xl font-black mb-4">Kabul Beyanı</h3>
          <p className="text-sm md:text-base opacity-90 max-w-2xl mx-auto leading-relaxed mb-6">
            Platformu kullanan herkes, bu Topluluk Sözleşmesi'ni okuduğunu, anladığını ve kabul ettiğini beyan eder. Kuralların ihlali, platformun yaptırım uygulama hakkını doğurur.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 bg-white text-red-600 px-8 py-3 rounded-full text-xs font-black uppercase hover:scale-105 transition-transform shadow-lg"
          >
            <span>Ana Sayfaya Dön</span>
            <span>→</span>
          </Link>
        </div>

        {/* FOOTER BİLGİ */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Son güncelleme: Aralık 2024 • Sorularınız için{' '}
            <Link href="/iletisim" className="text-red-600 hover:underline font-bold">
              iletişime geçin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}