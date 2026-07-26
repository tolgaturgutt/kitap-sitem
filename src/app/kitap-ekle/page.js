'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import Username from '@/components/Username';
import { usePremiumFeatureAccessState } from '@/hooks/usePremiumFeatureAccess';
import { normalizeYouTubeUrl } from '@/lib/youtube';


export default function KitapEkle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAudiobook = searchParams.get('tur') === 'sesli';
  const { canUsePremiumFeatures, loading: premiumAccessLoading } = usePremiumFeatureAccessState();
  const [loading, setLoading] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coAuthorInput, setCoAuthorInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    summary: '',
    trailer_url: '',
    cover_file: null
  });

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      const categoryNames = data?.map(c => c.name) || [];
      setCategories(categoryNames);
      
    // İlk kategoriyi default seç
      if (categoryNames.length > 0) {
        setFormData(prev => ({ ...prev, category: categoryNames[0] }));
      }

      // --- DÜZELTME: Adminleri email yerine ID'leri veya Usernameleri ile tanıyacağız ---
      // (Eğer announcement_admins tablosunda user_id veya username varsa onları çek, 
      // yoksa bile profiles tablosuyla eşleştirip adminlerin profil verilerini al)
      
      const { data: adminList } = await supabase.from('announcement_admins').select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      
      // Adminlerin e-postalarından gidip profillerini (ve username'lerini) bul
      if (emails.length > 0) {
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('username')
          .in('email', emails);
          
        setAdminEmails(adminProfiles?.map(p => p.username) || []); // Artık içinde mail değil, username'ler var!
      }
      } 
    fetchCategories(); 
  }, []); 

  useEffect(() => {
    if (!isAudiobook || premiumAccessLoading || canUsePremiumFeatures) return;

    toast.error('Sesli kitap yalnızca Premium üyeler ve adminler tarafından oluşturulabilir.');
    router.replace('/premium');
  }, [canUsePremiumFeatures, isAudiobook, premiumAccessLoading, router]);

// Resim Sıkıştırma Fonksiyonu
  async function handleImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const options = {
      maxSizeMB: 0.35,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.75
    };

    try {
      const compressedFile = await imageCompression(file, options);
      setFormData(prev => ({ ...prev, cover_file: compressedFile }));
    } catch (error) {
      console.log("Hata:", error);
      toast.error("Resim işlenemedi");
    }
  }
  // --- YENİ: Ortak Yazar Canlı Arama ---
  async function handleAuthorSearch(value) {
    setCoAuthorInput(value); // Önce inputu güncelle
    
    if (value.length < 2) {
      setSearchResults([]); // 2 harften azsa listeyi temizle
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, email, role')
      .ilike('username', `%${value}%`)
      .limit(5);

    if (data) {
      setSearchResults(data);
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (isAudiobook && !canUsePremiumFeatures) {
      toast.error('Sesli kitap yalnızca Premium üyeler ve adminler tarafından oluşturulabilir.');
      return;
    }
    if (!formData.cover_file) {
      toast.error("Lütfen kitabına bir kapak resmi yükle!");
      return; // Fonksiyonu burada bitir, aşağı inme.
    }
    setLoading(true);

    try {
      // 1. Kullanıcı Giriş Kontrolü
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Önce giriş yapmalısın.");

      // 2. Profildeki Güncel Kullanıcı Adını Al
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      const username = profile?.username || user.email.split('@')[0];
      let trailerUrl = null;

      if (formData.trailer_url.trim()) {
        if (!canUsePremiumFeatures) {
          throw new Error('PREMIUM_FEATURE_REQUIRED');
        }

        trailerUrl = normalizeYouTubeUrl(formData.trailer_url);
        if (!trailerUrl) {
          throw new Error('Geçerli bir YouTube video bağlantısı girmelisin.');
        }
      }

      let coverUrl = null;

      // 3. Kapak Resmi Yükleme
      if (formData.cover_file) {
        const file = formData.cover_file;
        const fileName = `${user.id}-${Math.random()}.jpg`;
        
        const { error: uploadError } = await supabase.storage.from('book-covers').upload(fileName, file, {
          cacheControl: '31536000',
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('book-covers').getPublicUrl(fileName);
        coverUrl = publicUrl;
      }
      // 3.5 Ortak Yazar Kontrolü
      let coAuthorId = null;
      let coAuthorStatus = null;

      if (coAuthorInput.trim()) {
        const { data: coUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', coAuthorInput.trim())
          .single();

        if (!coUser) {
          throw new Error(`"${coAuthorInput}" adında bir kullanıcı bulunamadı!`);
        }
        if (coUser.id === user.id) {
          throw new Error("Kendinizi ortak yazar ekleyemezsiniz!");
        }
        
        coAuthorId = coUser.id;
        coAuthorStatus = 'pending';
      }

      // 4. Kitabı Kaydet
      const { data, error } = await supabase.from('books').insert([
        {
          title: formData.title,
          category: formData.category,
          summary: formData.summary,
          trailer_url: trailerUrl,
          cover_url: coverUrl,
          user_id: user.id,
          user_email: user.email,
          username: username,
          book_type: isAudiobook ? 'audio' : 'text',
          co_author_id: coAuthorId,
          co_author_status: coAuthorStatus
        }
      ]).select();

      if (error) throw error;

      toast.success(isAudiobook ? 'Sesli kitap oluşturuldu!' : "Kitap başarıyla yayınlandı!");
      
      setTimeout(() => {
        router.push(`/kitap/${data[0].id}`);
      }, 1000);

    } catch (error) {
      toast.error(
        `${error?.message || ''}`.includes('PREMIUM_FEATURE_REQUIRED')
          ? isAudiobook
            ? 'Sesli kitap yalnızca Premium üyeler ve adminler tarafından oluşturulabilir.'
            : 'Kitap fragmanını yalnızca premium kullanıcılar ve adminler ekleyebilir.'
          : error.message || "Bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-20 px-6 flex items-center justify-center bg-[#fafafa] dark:bg-black transition-colors">
      
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          {isAudiobook && (
            <span className="mb-3 inline-flex rounded-full bg-amber-400 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-black">
              Premium
            </span>
          )}
          <h1 className="text-4xl font-black dark:text-white tracking-tighter mb-2">
            {isAudiobook ? 'Yeni Sesli Kitap Oluştur' : 'Yeni Kitap Yaz'}
          </h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
            {isAudiobook ? 'Podcast tarzı sesli eserini oluştur' : 'Hayal gücünü serbest bırak'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-3xl shadow-xl border dark:border-gray-800 space-y-6">
          
          {/* Kitap Adı */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              {isAudiobook ? 'Sesli Kitap Adı' : 'Kitap Adı'}
            </label>
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
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-gray-800 rounded-2xl font-bold dark:text-white outline-none focus:border-red-600 transition-colors"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
         {/* Ortak Yazar Ekleme (AKILLI ARAMA VERSİYONU) */}
          <div className="relative">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Ortak Yazar Davet Et (İsteğe Bağlı)</label>
            <input 
              type="text" 
              value={coAuthorInput}
              onChange={(e) => handleAuthorSearch(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-gray-800 rounded-2xl font-bold dark:text-white outline-none focus:border-red-600 transition-colors"
              placeholder="Kullanıcı adı aramaya başla..."
            />
            
            {/* Canlı Arama Sonuçları Listesi */}
            {searchResults.length > 0 && (
              <ul className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.map((userResult) => (
                  <li 
                    key={userResult.id}
                    onClick={() => {
                      setCoAuthorInput(userResult.username); 
                      setSearchResults([]); 
                    }}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center gap-3"
                  >
                    {/* YUVARLAK PROFİL FOTOĞRAFI */}
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
                      <img 
                        src={userResult.avatar_url || '/placeholder.png'} 
                        alt={userResult.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* KLAS USERNAME BİLEŞENİN */}
                    <div className="text-sm">
                      <Username 
                        username={userResult.username} 
                        isAdmin={adminEmails.includes(userResult.username)}
                        isPremium={userResult.role === 'premium'} 
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
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

          {canUsePremiumFeatures && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                YouTube Kitap Fragmanı
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[8px] text-black">
                  Premium
                </span>
              </label>
              <input
                type="url"
                value={formData.trailer_url}
                onChange={(e) => setFormData({
                  ...formData,
                  trailer_url: e.target.value,
                })}
                className="w-full rounded-2xl border bg-gray-50 p-4 text-sm outline-none transition-colors focus:border-red-600 dark:border-gray-800 dark:bg-black dark:text-white"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="mt-2 text-[10px] font-bold text-gray-400">
                YouTube&apos;dan video bağlantısını kopyalayıp buraya yapıştır.
              </p>
            </div>
          )}

          {/* Kapak Resmi Yükleme */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Kapak Resmi</label>
            <div className="relative w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-red-600 transition-colors group overflow-hidden">
            <input 
  type="file" 
  accept="image/*"
  onChange={handleImageChange} // Sadece burası değişti
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
            {loading
              ? 'Oluşturuluyor...'
              : isAudiobook
                ? 'Sesli Kitabı Oluştur'
                : 'Kitabı Yayınla'}
          </button>

        </form>
      </div>
    </div>
  );
}
