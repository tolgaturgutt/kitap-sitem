'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function KitapDuzenle({ params }) {
  const { id } = use(params);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [currentCover, setCurrentCover] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function getData() {
      // 1️⃣ Kategorileri çek
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      const categoryNames = categoriesData?.map(c => c.name) || [];
      setCategories(categoryNames);

      // 2️⃣ Kullanıcı kontrolü
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/giris');
        return;
      }

      // 3️⃣ Kitabı çek
      const { data: book, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !book) {
        toast.error('Kitap bulunamadı.');
        router.push('/profil');
        return;
      }

      // 4️⃣ Admin kontrolü
      let isAdmin = false;
      const { data: adminData } = await supabase
        .from('announcement_admins')
        .select('*')
        .eq('user_email', user.email)
        .single();
      if (adminData) isAdmin = true;

      // 5️⃣ Yetki kontrolü
      if (book.user_email !== user.email && !isAdmin) {
        toast.error('Bu yetki size ait değil.');
        router.push('/profil');
        return;
      }

      setTitle(book.title);
      setSummary(book.summary);
      setCategory(book.category || categoryNames[0] || '');
      setCurrentCover(book.cover_url);
      setLoading(false);
    }

    getData();
  }, [id, router]);

 async function guncelle() {
    // 1. Başlık ve Özet Kontrolü (Boşsa devam etme)
    if (!title.trim() || !summary.trim()) {
      toast.error("Başlık ve özet boş bırakılamaz.");
      return;
    }

    // 2. KAPAK KONTROLÜ (YENİ EKLENEN KISIM) 👇
    // Mantık: "Yeni dosya seçilmedi" VE "Ekranda eski kapak da yok" ise durdur.
    if (!newImageFile && !currentCover) {
      toast.error("Kitap kapağı zorunludur! Lütfen bir kapak yükleyin.");
      return;
    }
    // 👆 BİTİŞ

    setUpdating(true);
    let finalCoverUrl = currentCover;

    try {
      // Eğer yeni bir resim seçildiyse yükleyelim
      if (newImageFile) {
        const { data: { user } } = await supabase.auth.getUser();
        const fileExt = newImageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('book-covers')
          .upload(filePath, newImageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('book-covers')
          .getPublicUrl(filePath);
        
        finalCoverUrl = publicUrl;
      }

      const { error } = await supabase
        .from('books')
        .update({ 
          title, 
          summary, 
          category,
          cover_url: finalCoverUrl 
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Değişiklikler kaydedildi.');
      router.push(`/kitap/${id}`);
      router.refresh();
    } catch (error) {
      toast.error('Güncelleme sırasında bir hata oluştu.');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black p-6">
      <Toaster position="top-right" />

      <div className="w-full max-w-2xl bg-gray-50 dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <h1 className="text-2xl font-black mb-6 dark:text-white">Kitap Ayarları</h1>

        <div className="space-y-6">
          {/* Mevcut Kapak ve Yeni Seçim */}
          <div className="flex items-center gap-6">
            <div className="w-24 aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
              {currentCover && <img src={currentCover} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold mb-2 opacity-70">Kapağı Değiştir</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setNewImageFile(e.target.files[0])}
                className="text-xs text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 opacity-70">Başlık</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-white dark:bg-black border dark:border-gray-800 rounded-xl outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 opacity-70">Tür</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 bg-white dark:bg-black border dark:border-gray-800 rounded-xl outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 opacity-70">Özet</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows="4"
              className="w-full p-3 bg-white dark:bg-black border dark:border-gray-800 rounded-xl outline-none"
            ></textarea>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 py-3 bg-gray-200 dark:bg-gray-800 rounded-xl font-bold"
            >
              İptal
            </button>
            <button
              onClick={guncelle}
              disabled={updating}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
            >
              {updating ? 'Güncelleniyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}