'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import Username from '@/components/Username';

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
  const [adminEmails, setAdminEmails] = useState([]);
  const [coAuthorInput, setCoAuthorInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [initialCoAuthor, setInitialCoAuthor] = useState('');
  const [coAuthorStatusDisplay, setCoAuthorStatusDisplay] = useState('');
  const [bookOwnerId, setBookOwnerId] = useState(null);
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
      // --- YENİ: Ortak Yazar ve Admin Verilerini Çek ---
      setBookOwnerId(user.id);
      
      const { data: adminList } = await supabase.from('announcement_admins').select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      if (emails.length > 0) {
        const { data: adminProfiles } = await supabase.from('profiles').select('username').in('email', emails);
        setAdminEmails(adminProfiles?.map(p => p.username) || []);
      }

      if (book.co_author_id) {
        const { data: coProfile } = await supabase.from('profiles').select('username').eq('id', book.co_author_id).single();
        if (coProfile) {
          setCoAuthorInput(coProfile.username);
          setInitialCoAuthor(coProfile.username);
          setCoAuthorStatusDisplay(book.co_author_status === 'accepted' ? '✅ Onaylandı' : '⏳ Onay Bekliyor');
        }
      }
      setLoading(false);
    }

    getData();
  }, [id, router]);
// --- YENİ: Ortak Yazar Canlı Arama ---
  async function handleAuthorSearch(value) {
    setCoAuthorInput(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, email, role')
      .ilike('username', `%${value}%`)
      .limit(5);

    if (data) setSearchResults(data);
  }
async function guncelle() {
    // 1. Başlık ve Özet Kontrolü
    if (!title.trim() || !summary.trim()) {
      toast.error("Başlık ve özet boş bırakılamaz.");
      return;
    }

    // 2. KAPAK KONTROLÜ
    if (!newImageFile && !currentCover) {
      toast.error("Kitap kapağı zorunludur! Lütfen bir kapak yükleyin.");
      return;
    }

    setUpdating(true);
    let finalCoverUrl = currentCover;

    try {
      
      // Eğer yeni bir resim seçildiyse: SIKIŞTIR VE YÜKLE
      if (newImageFile) {
        const { data: { user } } = await supabase.auth.getUser();
        
        // YENİ KALİTELİ AYARLAR (Burayı değiştiriyorsun)
        const options = {
          maxSizeMB: 1,           
          maxWidthOrHeight: 1920, 
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.8    
        };

        const compressedFile = await imageCompression(newImageFile, options);

        // Dosya adı oluştur (Hepsi JPG olacak)
        const fileName = `${Math.random()}.jpg`;
        const filePath = `${user.id}/${fileName}`;

        // Sıkıştırılmış dosyayı (compressedFile) yükle
        const { error: uploadError } = await supabase.storage
          .from('book-covers')
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('book-covers')
          .getPublicUrl(filePath);
        
        finalCoverUrl = publicUrl;
      }
 // ✅✅✅ BİTİŞ ✅✅✅

      let updateData = {
        title, 
        summary, 
        category,
        cover_url: finalCoverUrl
      };

      // SADECE daha önceden bir ortak yazar yoksa ve KUTUYA yeni biri yazıldıysa işlem yap
      if (!initialCoAuthor && coAuthorInput.trim() !== "") {
        const { data: coUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', coAuthorInput.trim())
          .single();

        if (!coUser) {
          toast.error(`"${coAuthorInput}" adında bir kullanıcı bulunamadı!`);
          setUpdating(false);
          return;
        }
        if (coUser.id === bookOwnerId) {
          toast.error("Kendinizi ortak yazar olarak ekleyemezsiniz!");
          setUpdating(false);
          return;
        }
        updateData.co_author_id = coUser.id;
        updateData.co_author_status = 'pending';
      }

      const { error } = await supabase
        .from('books')
        .update(updateData)
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
         {/* Ortak Yazar Ekleme / Görünümü */}
          <div>
            <label className="block text-sm font-bold mb-2 opacity-70">
              Ortak Yazar {initialCoAuthor ? '' : <span className="text-xs font-normal opacity-75">(Sadece 1 kez eklenebilir)</span>}
            </label>

            {initialCoAuthor ? (
              /* ZATEN EKLİYSE: Değiştirilemez Kilitli Kutu */
              <div className="w-full p-4 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between cursor-not-allowed opacity-80">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🤝</span>
                  <span className="font-bold dark:text-white">@{initialCoAuthor}</span>
                </div>
                <span className="text-[10px] font-black uppercase text-gray-500 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-md shadow-sm">
                  {coAuthorStatusDisplay}
                </span>
              </div>
            ) : (
              /* HİÇ EKLENMEMİŞSE: Arama Kutusu */
              <div className="relative">
                <input 
                  type="text" 
                  value={coAuthorInput}
                  onChange={(e) => handleAuthorSearch(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-black border dark:border-gray-800 rounded-xl outline-none focus:border-blue-500"
                  placeholder="Kullanıcı adı ara..."
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
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
                          <img 
                            src={userResult.avatar_url || '/placeholder.png'} 
                            alt={userResult.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
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
            )}
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