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

  // ✅ KELİME SAYISINI HESAPLA
  const wordCount = formData.content.trim() === '' ? 0 : formData.content.trim().split(/\s+/).length;

  useEffect(() => {
    // Params'ı unwrap et
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

        // --- YENİ ADMİN KONTROLÜ ---
        let isAdmin = false;
        const { data: adminData } = await supabase.from('announcement_admins').select('*').eq('user_email', user.email).single();
        if (adminData) isAdmin = true;

        // Kural: Yazar değilse VE Admin değilse engelle
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

    setUpdating(true);

    try {
      // NOT: Veritabanına word_count eklenince buraya da eklenebilir.
      const { data, error } = await supabase
        .from('chapters')
        .update({ 
          title: formData.title, 
          content: formData.content,
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
            </label>
            <input 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full p-5 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-full outline-none focus:ring-2 ring-red-600/20 dark:text-white font-bold"
              placeholder="Örn: 1. Başlangıç"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-4">
              İçerik
            </label>
            <textarea 
              required
              rows="15"
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              className="w-full p-8 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-[2.5rem] outline-none focus:ring-2 ring-red-600/20 dark:text-white font-serif text-lg leading-relaxed"
              placeholder="Hikayeni buraya yaz..."
            />
            
            {/* ✅ KELİME SAYACI - BURAYA EKLENDİ */}
            <div className="flex justify-end mt-2 px-4">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 select-none">
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
              disabled={updating}
              className="flex-[2] h-14 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/10 hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {updating ? 'GÜNCELLENİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET ✅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}