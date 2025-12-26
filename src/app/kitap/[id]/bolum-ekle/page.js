'use client';

import { useState, use, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function BolumEkle({ params }) {
  const { id } = use(params);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [bannedWords, setBannedWords] = useState([]);
  const router = useRouter();

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
  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;

  // 🔴 YASAKLI KELİMELERİ TESPİT ET
  function findBannedWords(text) {
    if (!text || bannedWords.length === 0) return [];
    
    const words = text.toLowerCase().split(/\b/); // Kelime sınırlarına göre böl
    const found = [];
    
    bannedWords.forEach(banned => {
      words.forEach(word => {
        if (word.includes(banned)) {
          found.push(banned);
        }
      });
    });
    
    return [...new Set(found)]; // Tekrarları kaldır
  }

  const detectedBannedInTitle = findBannedWords(title);
  const detectedBannedInContent = findBannedWords(content);
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

  async function bolumKaydet() {
    if (!title.trim() || !content.trim()) {
      toast.error('Bölüm başlığı ve içeriği boş bırakılamaz.');
      return;
    }

    // 🔴 YASAKLI KELİME VARSA İZİN VERME
    if (hasBannedWords) {
      toast.error(`⚠️ Yasaklı kelimeler tespit edildi: ${allDetectedBanned.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      // Kitap bilgisini al
      const { data: book } = await supabase
        .from('books')
        .select('title, username')
        .eq('id', id)
        .single();

      // Mevcut bölüm sayısını bulup sıra numarası ver
      const { count } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', id);

      const sirasi = (count || 0) + 1;

      // 🔴 SANSÜRLÜ İÇERİK OLUŞTUR
      const censoredTitle = censorContent(title);
      const censoredContent = censorContent(content);

      const { data: newChapter, error } = await supabase
        .from('chapters')
        .insert([{
          book_id: id,
          title: censoredTitle, // 👈 Sansürlü başlık
          content: censoredContent, // 👈 Sansürlü içerik
          order_no: sirasi,
        }])
        .select()
        .single();

      if (error) throw error;

      // TAKİPÇİLERE BİLDİRİM GÖNDER
      const { data: followers } = await supabase
        .from('follows')
        .select('user_email')
        .eq('book_id', id);

      if (followers && followers.length > 0) {
        const notifications = followers.map(f => ({
          recipient_email: f.user_email,
          actor_username: book.username,
          type: 'new_chapter',
          book_title: book.title,
          book_id: parseInt(id),
          chapter_id: newChapter.id,
          is_read: false,
          created_at: new Date()
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast.success('Bölüm başarıyla yayınlandı!');
      setTimeout(() => {
        router.push(`/kitap/${id}`);
        router.refresh();
      }, 1000);

    } catch (error) {
      console.error(error);
      toast.error('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-black text-gray-900 dark:text-white p-6">
      <Toaster position="top-right" />

      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <h1 className="text-2xl font-bold mb-6">Yeni Bölüm Ekle</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70">
              Bölüm Başlığı
              {detectedBannedInTitle.length > 0 && (
                <span className="ml-2 text-red-500 text-xs animate-pulse">
                  ⚠️ Yasaklı kelime: {detectedBannedInTitle.join(', ')}
                </span>
              )}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full p-3 bg-gray-50 dark:bg-black border rounded-lg outline-none focus:border-blue-500 font-bold ${
                detectedBannedInTitle.length > 0 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="Örn: 1. Başlangıç"
            />
            
            {/* 🔴 BAŞLIKTA YASAKLI KELİMELERİ GÖSTER */}
            {detectedBannedInTitle.length > 0 && title && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                  ÖNİZLEME (Yasaklı kelimeler vurgulandı):
                </p>
                <div 
                  className="text-sm font-bold"
                  dangerouslySetInnerHTML={{ __html: highlightContent(title) }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70">
              Bölüm İçeriği
              {detectedBannedInContent.length > 0 && (
                <span className="ml-2 text-red-500 text-xs animate-pulse">
                  ⚠️ Yasaklı kelime: {detectedBannedInContent.join(', ')}
                </span>
              )}
            </label>
            
            {/* 🔴 TEXTAREA (Yazma için) */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="15"
              className={`w-full p-4 bg-gray-50 dark:bg-black border rounded-lg outline-none focus:border-blue-500 leading-relaxed resize-y ${
                detectedBannedInContent.length > 0 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="Hikayenizi buraya yazın..."
            ></textarea>

            {/* 🔴 İÇERİKTE YASAKLI KELİMELERİ GÖSTER */}
            {detectedBannedInContent.length > 0 && content && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">
                  ÖNİZLEME (Yasaklı kelimeler vurgulandı):
                </p>
                <div 
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: highlightContent(content) }}
                />
              </div>
            )}
            
            {/* ✅ KELİME SAYACI */}
            <div className="flex justify-between items-center mt-2 px-1">
              {hasBannedWords && (
                <span className="text-xs font-bold text-red-500">
                  🚫 Bu içerik yayınlanamaz
                </span>
              )}
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 select-none ml-auto">
                {wordCount} Kelime
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-4">
             <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              İptal
            </button>
            <button
              onClick={bolumKaydet}
              disabled={loading || hasBannedWords}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Kaydediliyor...' : hasBannedWords ? '🚫 Yayınlanamaz' : 'Yayınla 🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}