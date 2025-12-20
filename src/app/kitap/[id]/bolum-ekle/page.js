'use client';

import { useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function BolumEkle({ params }) {
  const { id } = use(params); // Kitap ID'si
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function bolumKaydet() {
    if (!title.trim() || !content.trim()) {
      toast.error('Bölüm başlığı ve içeriği boş bırakılamaz.');
      return;
    }

    setLoading(true);

    // Mevcut bölüm sayısını bulup sıra numarası (order_no) verelim
    const { count } = await supabase
      .from('chapters')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', id);

    const sirasi = (count || 0) + 1;

    const { error } = await supabase
      .from('chapters')
      .insert([{
        book_id: id,
        title: title,
        content: content,
        order_no: sirasi
      }]);

    if (error) {
      console.error(error);
      toast.error('Bir hata oluştu.');
      setLoading(false);
    } else {
      toast.success('Bölüm başarıyla yayınlandı.');
      setTimeout(() => {
        router.push(`/kitap/${id}`); // Kitap detayına geri dön
        router.refresh();
      }, 1000);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-black text-gray-900 dark:text-white p-6">
      <Toaster position="top-right" />

      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <h1 className="text-2xl font-bold mb-6">Yeni Bölüm Ekle</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70">Bölüm Başlığı</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 font-bold"
              placeholder="Örn: 1. Başlangıç"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70">Bölüm İçeriği</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="15"
              className="w-full p-4 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 leading-relaxed"
              placeholder="Hikayenizi buraya yazın..."
            ></textarea>
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
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
            >
              {loading ? 'Kaydediliyor...' : 'Yayınla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}