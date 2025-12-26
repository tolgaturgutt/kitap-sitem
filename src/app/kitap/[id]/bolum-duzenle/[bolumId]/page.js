'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function BolumDuzenle({ params }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [ids, setIds] = useState({ kitapId: null, bolumId: null });
  const [bannedWords, setBannedWords] = useState([]);

  // 🔴 YASAKLI KELİMELERİ VERİTABANINDAN ÇEK
  useEffect(() => {
    async function fetchBannedWords() {
      const { data } = await supabase
        .from('banned_words')
        .select('word');
      
      if (data) {
        setBannedWords(data.map(item => item.word.toLowerCase()));
      }
    }
    fetchBannedWords();
  }, []);

  // ✅ KELİME SAYISINI HESAPLA
  const wordCount = formData.content.trim() === '' ? 0 : formData.content.trim().split(/\s+/).length;

  // 🔴 YASAKLI KELİMELERİ TESPİT ET
  function findBannedWords(text) {
    if (!text || bannedWords.length === 0) return [];
    
    const words = text.toLowerCase().split(/\b/);
    const found = [];
    
    bannedWords.forEach(banned => {
      words.forEach(word => {
        if (word.includes(banned)) {
          found.push(banned);
        }
      });
    });
    
    return [...new Set(found)];
  }

  const detectedBannedInTitle = findBannedWords(formData.title);
  const detectedBannedInContent = findBannedWords(formData.content);
  const allDetectedBanned = [...new Set([...detectedBannedInTitle, ...detectedBannedInContent])];
  const hasBannedWords = allDetectedBanned.length > 0;

  // 🔴 İÇERİĞİ HIGHLIGHT ET
  function highlightContent(text) {
    if (!text || bannedWords.length === 0) return text;
    
    let highlighted = text;
    bannedWords.forEach(banned => {
      const regex = new RegExp(`(${banned})`, 'gi');
      highlighted = highlighted.replace(
        regex, 
        '<mark class="bg-red-600 text-white rounded px-1 animate-pulse">$1</mark>'
      );
    });
    
    return highlighted;
  }

  // 🔴 SANSÜRLEME FONKSİYONU
  function censorContent(text) {
    let censored = text;
    bannedWords.forEach(banned => {
      const regex = new RegExp(banned, 'gi');
      censored = censored.replace(regex, '***');
    });
    return censored;
  }

  useEffect(() => {
    async function unwrapParams() {
      const unwrapped = await params;
      setIds({ kitapId: unwrapped.id, bolumId: unwrapped.bolumId });
    }
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!ids.kitapId || !ids.bolumId) return;

    async function getChapterData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("Giriş yapmalısın.");
          return router.push('/giris');
        }

        const { data: chapter, error } = await supabase
          .from('chapters')
          .select('*, books(user_email)')
          .eq('id', ids.bolumId)
          .single();

        if (error || !chapter) {
          toast.error("Bölüm bulunamadı.");
          return router.push(`/kitap/${ids.kitapId}`);
        }

        let isAdmin = false;
        const { data: adminData } = await supabase.from('announcement_admins').select('*').eq('user_email', user.email).single();
        if (adminData) isAdmin = true;

        if (chapter.books.user_email !== user?.email && !isAdmin) {
          toast.error("Bu yetkiye sahip değilsin.");
          return router.push(`/kitap/${ids.kitapId}`);
        }

        setFormData({ title: chapter.title, content: chapter.content });
        setLoading(false);
      } catch (error) {
        console.error('Hata:', error);
        toast.error("Bir hata oluştu.");
        router.push(`/kitap/${ids.kitapId}`);
      }
    }
    getChapterData();
  }, [ids, router]);

  async function handleUpdate(e) {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Başlık ve içerik boş olamaz.");
      return;
    }

    // 🔴 YASAKLI KELİME VARSA İZİN VERME
    if (hasBannedWords) {
      toast.error(`⚠️ Yasaklı kelimeler tespit edildi: ${allDetectedBanned.join(', ')}`);
      return;
    }

    setUpdating(true);

    try {
      // 🔴 SANSÜRLÜ İÇERİK OLUŞTUR
      const censoredTitle = censorContent(formData.title);
      const censoredContent = censorContent(formData.content);

      const { data, error } = await supabase
        .from('chapters')
        .update({ 
          title: censoredTitle,
          content: censoredContent,
          updated_at: new Date() 
        })
        .eq('id', ids.bolumId)
        .select(); 

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("İşlem başarısız! Yetkiniz yok veya bölüm silinmiş.");
        return;
      }

      toast.success("Bölüm güncellendi! ✅");
      setTimeout(() => {
        router.push(`/kitap/${ids.kitapId}/bolum/${ids.bolumId}`);
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast.error("Güncelleme sırasında hata oluştu: " + (error.message || "Bilinmeyen hata"));
    } finally {
      setUpdating(false);
    }
  }

  if (loading || !ids.kitapId) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black opacity-10 text-5xl italic animate-pulse">
        YUKLENIYOR
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 px-6 bg-[#fcfcfc] dark:bg-[#080808]">
      <Toaster />
      <div className="max-w-3xl mx-auto">
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-black dark:text-white tracking-tighter mb-4">Bölümü Düzenle</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">
            Eserini Mükemmelleştir
          </p>
        </header>

        <form onSubmit={handleUpdate} className="space-y-8 bg-white dark:bg-black/20 p-10 rounded-[3rem] border dark:border-white/5 shadow-xl shadow-black/5">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-4">
              Bölüm Başlığı
              {detectedBannedInTitle.length > 0 && (
                <span className="ml-2 text-red-500 text-xs animate-pulse">
                  ⚠️ Yasaklı kelime: {detectedBannedInTitle.join(', ')}
                </span>
              )}
            </label>
            <input 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className={`w-full p-5 bg-gray-50 dark:bg-white/5 border rounded-full outline-none focus:ring-2 ring-red-600/20 dark:text-white font-bold ${
                detectedBannedInTitle.length > 0 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'dark:border-white/5'
              }`}
              placeholder="Örn: 1. Başlangıç"
            />
            
            {/* 🔴 BAŞLIKTA YASAKLI KELİMELERİ GÖSTER */}
            {detectedBannedInTitle.length > 0 && formData.title && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                  ÖNİZLEME (Yasaklı kelimeler vurgulandı):
                </p>
                <div 
                  className="text-sm font-bold"
                  dangerouslySetInnerHTML={{ __html: highlightContent(formData.title) }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-4">
              İçerik
              {detectedBannedInContent.length > 0 && (
                <span className="ml-2 text-red-500 text-xs animate-pulse">
                  ⚠️ Yasaklı kelime: {detectedBannedInContent.join(', ')}
                </span>
              )}
            </label>
            <textarea 
              required
              rows="15"
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              className={`w-full p-8 bg-gray-50 dark:bg-white/5 border rounded-[2.5rem] outline-none focus:ring-2 ring-red-600/20 dark:text-white font-serif text-lg leading-relaxed ${
                detectedBannedInContent.length > 0 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'dark:border-white/5'
              }`}
              placeholder="Hikayeni buraya yaz..."
            />
            
            {/* 🔴 İÇERİKTE YASAKLI KELİMELERİ GÖSTER */}
            {detectedBannedInContent.length > 0 && formData.content && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">
                  ÖNİZLEME (Yasaklı kelimeler vurgulandı):
                </p>
                <div 
                  className="text-sm leading-relaxed whitespace-pre-wrap font-serif"
                  dangerouslySetInnerHTML={{ __html: highlightContent(formData.content) }}
                />
              </div>
            )}
            
            {/* ✅ KELİME SAYACI */}
            <div className="flex justify-between items-center mt-2 px-4">
              {hasBannedWords && (
                <span className="text-xs font-bold text-red-500">
                  🚫 Bu içerik güncellenemez
                </span>
              )}
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 select-none ml-auto">
                {wordCount} Kelime
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={() => router.push(`/kitap/${ids.kitapId}`)}
              className="flex-1 h-14 rounded-full bg-gray-100 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
            >
              Vazgeç
            </button>
            <button 
              type="submit" 
              disabled={updating || hasBannedWords}
              className="flex-[2] h-14 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/10 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'GÜNCELLENİYOR...' : hasBannedWords ? '🚫 Güncellenemez' : 'DEĞİŞİKLİKLERİ KAYDET ✅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}