'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function BolumDuzenle({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id; // Kitap ID
  const bolumId = unwrappedParams.bolumId; // Bölüm ID
  
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    async function getChapterData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Giriş yapmalısın.");
        return router.push('/giris');
      }

      const { data: chapter, error } = await supabase
        .from('chapters')
        .select('*, books(user_email)')
        .eq('id', bolumId)
        .single();

      if (error || !chapter) {
        toast.error("Bölüm bulunamadı.");
        return router.push(`/kitap/${id}`);
      }

      // Güvenlik: Sadece yazar düzenleyebilir
      if (chapter.books.user_email !== user?.email) {
        toast.error("Bu yetkiye sahip değilsin.");
        return router.push(`/kitap/${id}`);
      }

      setFormData({ title: chapter.title, content: chapter.content });
      setLoading(false);
    }
    getChapterData();
  }, [id, bolumId, router]);

  async function handleUpdate(e) {
    e.preventDefault();
    setUpdating(true);

    const { error } = await supabase
      .from('chapters')
      .update({ 
        title: formData.title, 
        content: formData.content,
        updated_at: new Date() 
      })
      .eq('id', bolumId);

    if (!error) {
      toast.success("Bölüm güncellendi!");
      setTimeout(() => router.push(`/kitap/${id}/bolum/${bolumId}`), 1000);
    } else {
      toast.error("Hata oluştu.");
    }
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black opacity-10 text-5xl italic">
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
          </div>

          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="flex-1 h-14 rounded-full bg-gray-100 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
            >
              Vazgeç
            </button>
            <button 
              type="submit" 
              disabled={updating}
              className="flex-[2] h-14 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/10 hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {updating ? 'GÜNCELLENİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}