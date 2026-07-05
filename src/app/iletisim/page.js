'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function DestekIletisim() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subjects = [
    { value: '', label: 'Konu seçin...' },
    { value: '🐛 Teknik Sorun', label: '🐛 Teknik Sorun' },
    { value: '🔒 Hesap Sorunu', label: '🔒 Hesap Sorunu' },
    { value: '🚫 İçerik Şikayeti', label: '🚫 İçerik Şikayeti' },
    { value: '💡 Öneri & Geri Bildirim', label: '💡 Öneri & Geri Bildirim' },
    { value: '📜 Kural İhlali Bildirimi', label: '📜 Kural İhlali Bildirimi' },
    { value: '🔐 KVKK Talebi', label: '🔐 KVKK Talebi' },
    { value: '❓ Diğer', label: '❓ Diğer' }
  ];

  const quickLinks = [
    { icon: '📜', title: 'Topluluk Kuralları', desc: 'Platform kurallarını inceleyin', link: '/kurallar' },
    { icon: '🔐', title: 'KVKK Metni', desc: 'Kişisel veri politikamız', link: '/kvkk' },
    { icon: '⚙️', title: 'Profil Ayarları', desc: 'Hesap ayarlarınızı yönetin', link: '/ayarlar' }
  ];

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.full_name.trim() || !formData.email.trim() || !formData.subject || !formData.message.trim()) {
      return toast.error('Lütfen tüm alanları doldurun');
    }

    if (!formData.email.includes('@')) {
      return toast.error('Geçerli bir e-posta adresi girin');
    }

    if (formData.message.length > 1000) {
      return toast.error('Mesaj maksimum 1000 karakter olmalı');
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('support_messages').insert({
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      subject: formData.subject,
      message: formData.message.trim(),
      status: 'new'
    });

    if (error) {
      toast.error('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      console.error(error);
    } else {
      toast.success('Mesajınız gönderildi! En kısa sürede size dönüş yapacağız. 📧');
      setFormData({ full_name: '', email: '', subject: '', message: '' });
    }

    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black py-12 md:py-20 px-4 md:px-6 transition-colors">
      <Toaster />
      
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-3 bg-white dark:bg-white/5 px-6 py-3 rounded-full border dark:border-white/10 mb-6 shadow-lg">
            <span className="text-2xl">🛟</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-600">Yardım Merkezi</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            <span className="text-black dark:text-white">Destek ve </span>
            <span className="text-purple-600">İletişim</span>
          </h1>
          
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-6">
            Size yardımcı olmak için buradayız! Sorularınız, önerileriniz veya sorunlarınız için bizimle iletişime geçebilirsiniz.
          </p>

          <div className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full">
            <span>📧</span>
            <a href="mailto:iletisim@kitaplab.com" className="font-bold hover:text-purple-600 transition-colors">
              iletisim@kitaplab.com
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {/* İLETİŞİM FORMU */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-white/5 border dark:border-white/10 rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-xl">
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <div className="w-12 h-12 bg-purple-600/10 rounded-2xl flex items-center justify-center text-2xl">
                  ✉️
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black dark:text-white">Mesaj Gönder</h2>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">24-48 saat içinde yanıt</p>
                </div>
              </div>

              <div className="space-y-4 md:space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                      Ad Soyad *
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Adınız ve soyadınız"
                      className="w-full p-3 md:p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-xl md:rounded-2xl text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                      E-posta *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ornek@email.com"
                      className="w-full p-3 md:p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-xl md:rounded-2xl text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    Konu *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-3 md:p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-xl md:rounded-2xl text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
                  >
                    {subjects.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Mesajınız *
                    </label>
                    <span className="text-[9px] text-gray-400">
                      {formData.message.length}/1000
                    </span>
                  </div>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Mesajınızı detaylı bir şekilde yazın..."
                    maxLength={1000}
                    rows={6}
                    className="w-full p-3 md:p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-xl md:rounded-2xl text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 md:py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl md:rounded-2xl text-sm md:text-base font-black uppercase tracking-widest shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Mesajı Gönder 🚀'}
                </button>

                <p className="text-xs text-center text-gray-500 dark:text-gray-600">
                  Mesajınızı göndererek{' '}
                  <Link href="/kvkk" className="text-purple-600 hover:underline font-bold">
                    KVKK Aydınlatma Metni
                  </Link>
                  &apos;ni kabul etmiş olursunuz.
                </p>
              </div>
            </div>
          </div>

          {/* HIZLI ERİŞİM */}
          <div className="space-y-4 md:space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6 md:p-8 rounded-3xl border-2 border-purple-200 dark:border-purple-900/30">
              <div className="text-4xl mb-4">⏱️</div>
              <h3 className="text-lg font-black mb-2 dark:text-white">Yanıt Süresi</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Mesajlarınıza genellikle <strong>24-48 saat</strong> içinde yanıt veriyoruz. Acil durumlar için daha hızlı dönüş sağlıyoruz.
              </p>
            </div>

            <div className="bg-white dark:bg-white/5 border dark:border-white/10 rounded-3xl p-6 md:p-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">
                Hızlı Erişim
              </h3>
              <div className="space-y-3">
                {quickLinks.map((item, i) => (
                  <Link
                    key={i}
                    href={item.link}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
                  >
                    <div className="w-10 h-10 bg-purple-600/10 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold dark:text-white group-hover:text-purple-600 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {item.desc}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-6 md:p-8 rounded-3xl border-2 border-blue-200 dark:border-blue-900/30">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-lg font-black mb-2 dark:text-white">İpucu</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Mesajınızda sorununuzu detaylı açıklarsanız size daha hızlı ve etkili yardımcı olabiliriz.
              </p>
            </div>
          </div>
        </div>

        {/* SIK SORULAN SORULAR */}
        <div className="mt-12 md:mt-16 bg-white dark:bg-white/5 border dark:border-white/10 rounded-3xl md:rounded-[3rem] p-6 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full mb-4">
              <span className="text-xl">❓</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">
                Sık Sorulan Sorular
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black dark:text-white">
              Hızlı Yanıtlar
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl">
              <h3 className="text-sm font-black mb-2 dark:text-white flex items-center gap-2">
                <span>🔑</span> Şifremi unuttum, ne yapmalıyım?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Giriş sayfasında “Şifremi Unuttum” linkine tıklayarak e-postanıza şifre sıfırlama bağlantısı gönderebilirsiniz.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl">
              <h3 className="text-sm font-black mb-2 dark:text-white flex items-center gap-2">
                <span>🚫</span> İçerik nasıl raporlanır?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Her içeriğin üzerinde bulunan “...” menüsünden “Rapor Et” seçeneğini kullanabilirsiniz.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl">
              <h3 className="text-sm font-black mb-2 dark:text-white flex items-center gap-2">
                <span>🗑️</span> Hesabımı nasıl silerim?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Ayarlar sayfasından hesap silme talebinde bulunabilir veya bize mesaj gönderebilirsiniz.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl">
              <h3 className="text-sm font-black mb-2 dark:text-white flex items-center gap-2">
                <span>📧</span> E-posta adresimi değiştirebilir miyim?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Güvenlik nedeniyle e-posta değişikliği için bizimle iletişime geçmeniz gerekmektedir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
