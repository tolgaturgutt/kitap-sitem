'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

const KATEGORILER = ["Macera", "Bilim Kurgu", "Korku", "Romantik", "Dram", "Fantastik", "Polisiye"];

export default function KitapEkle() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Macera',
    summary: '',
    cover_file: null
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Kullanıcı Giriş Kontrolü
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Önce giriş yapmalısın.");

      // 2. Profildeki Güncel Kullanıcı Adını Al
      // (Eski kodlarda burası yoktu, kitap isimsiz gidiyordu)
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      const username = profile?.username || user.email.split('@')[0];

      let coverUrl = null;

      // 3. Kapak Resmi Yükleme
      if (formData.cover_file) {
        const file = formData.cover_file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('book-covers').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('book-covers').getPublicUrl(fileName);
        coverUrl = publicUrl;
      }

      // 4. Kitabı Kaydet
      const { data, error } = await supabase.from('books').insert([
        {
          title: formData.title,
          category: formData.category,
          summary: formData.summary,
          cover_url: coverUrl,
          user_email: user.email,
          username: username // Güncel kullanıcı adını kaydeder
        }
      ]).select();

      if (error) throw error;

      toast.success("Kitap başarıyla yayınlandı!");
      
      // Oluşturulan kitaba yönlendir
      setTimeout(() => {
        router.push(`/kitap/${data[0].id}`);
      }, 1000);

    } catch (error) {
      toast.error(error.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-20 px-6 flex items-center justify-center bg-[#fafafa] dark:bg-black transition-colors">
      <Toaster />
      
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black dark:text-white tracking-tighter mb-2">Yeni Kitap Yaz</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Hayal gücünü serbest bırak</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-3xl shadow-xl border dark:border-gray-800 space-y-6">
          
          {/* Kitap Adı */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Kitap Adı</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-gray-800 rounded-2xl font-bold dark:text-white outline-none focus:border-red-600 transition-colors"
              placeholder="Örn: Karanlığın Ötesinde"
            />
          </div>

          {/* Kategori Seçimi */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {KATEGORILER.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({...formData, category: cat})}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.category === cat ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-gray-100 dark:bg-black text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Özet Alanı */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Özet / Tanıtım</label>
            <textarea 
              required
              rows="5"
              value={formData.summary}
              onChange={(e) => setFormData({...formData, summary: e.target.value})}
              className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-gray-800 rounded-2xl text-sm dark:text-white outline-none focus:border-red-600 transition-colors"
              placeholder="Kitabını anlatan kısa bir özet..."
            />
          </div>

          {/* Kapak Resmi Yükleme */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Kapak Resmi</label>
            <div className="relative w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-red-600 transition-colors group overflow-hidden">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setFormData({...formData, cover_file: e.target.files[0]})}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              {formData.cover_file ? (
                <div className="text-center">
                  <span className="text-2xl">✅</span>
                  <p className="text-xs font-bold text-green-500 mt-2">{formData.cover_file.name}</p>
                </div>
              ) : (
                <>
                  <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📷</span>
                  <span className="text-xs font-bold text-gray-400 group-hover:text-red-600">Resim Seçmek İçin Tıkla</span>
                </>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Yayınlanıyor...' : 'Kitabı Yayınla'}
          </button>

        </form>
      </div>
    </div>
  );
}