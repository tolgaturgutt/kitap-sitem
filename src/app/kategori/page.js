'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image'; // 1. BURASI EKLENDİ

export default function KategoriPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      
      setCategories(data || []);
      setLoading(false);
    }
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-40 flex justify-center items-center animate-pulse bg-[#fafafa] dark:bg-black">
        <div className="text-5xl font-black tracking-tighter">
          <span className="text-black dark:text-white">Kitap</span>
          <span className="text-red-600">Lab</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 md:py-16 px-4 md:px-6 lg:px-16 bg-[#fafafa] dark:bg-black">
      <div className="max-w-7xl mx-auto">
        
        {/* 🔴 BAŞLIK */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter dark:text-white mb-3">
            Kategoriler
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">
            Tüm kategorileri keşfet, favori türünü bul
          </p>
        </div>

        {/* 🔴 KATEGORİ KARTLARI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {categories.map((category) => (
            <Link 
              key={category.id} 
              href={`/kategori/${category.slug}`}
              className="group relative aspect-[4/3] rounded-2xl md:rounded-3xl overflow-hidden border dark:border-white/10 hover:border-red-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              {/* 🖼️ ARKA PLAN GÖRSELI (GÜNCELLENDİ) */}
              <div className="absolute inset-0">
                <Image 
                  src={category.image_url} 
                  alt={category.name}
                  fill // Resmi kutuya tam sığdırır
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" // Telefondaysa küçük, PC'de büyük yükle emri
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
              </div>

              {/* 📝 KATEGORİ ADI */}
              <div className="absolute inset-0 flex items-end p-4 md:p-6 z-20">
                <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight group-hover:text-red-500 transition-colors drop-shadow-lg">
                  {category.name}
                </h2>
              </div>
            </Link>
          ))}
        </div>

        {/* 🔴 BOŞ DURUM */}
        {categories.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-xl font-bold text-gray-400">
              Henüz kategori eklenmemiş
            </p>
          </div>
        )}

      </div>
    </div>
  );
}