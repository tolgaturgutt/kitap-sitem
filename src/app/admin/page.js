'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

// --- İKONLAR ---
const Icons = {
  Search: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>),
  Photo: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 6v12a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>),
  Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>),
  Delete: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
  Plus: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>),
  Ban: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>),
};

const getTargetEmoji = (type) => {
  const map = { 'user': '👤', 'comment': '💬', 'book': '📖', 'review': '⭐', 'chapter': '📄', 'default': '🎯' };
  return map[type] || map.default;
};

export default function AdminPanel() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('duyurular');
  const [loading, setLoading] = useState(true);

  const USERS_PER_PAGE = 10;
  const REPORTS_PER_PAGE = 15;
  const SUPPORT_PER_PAGE = 15;

  // 1. DUYURULAR
  const [duyurular, setDuyurular] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [duyuruForm, setDuyuruForm] = useState({
    title: '', content: '', type: 'bilgi', priority: 1, is_active: true,
    image_url: null, text_color: '#000000', display_type: 'wide', action_link: '', action_text: ''
  });

  // 2. KULLANICILAR
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 3. ŞİKAYETLER
  const [reports, setReports] = useState([]);
  const [reportPage, setReportPage] = useState(1);
  const [totalReportPages, setTotalReportPages] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [reportFilter, setReportFilter] = useState('pending');
  const [loadingReports, setLoadingReports] = useState(false);

  // 4. DESTEK
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportPage, setSupportPage] = useState(1);
  const [totalSupportPages, setTotalSupportPages] = useState(0);
  const [totalSupport, setTotalSupport] = useState(0);
  const [supportFilter, setSupportFilter] = useState('all');
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [supportModal, setSupportModal] = useState(null);

  // 5. YASAKLI KELİMELER
  const [bannedWords, setBannedWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [loadingBanned, setLoadingBanned] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');

  // 6. KATEGORİLER
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', image_url: '', priority: 1, is_active: true });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
// 7. ETKİNLİKLER
const [events, setEvents] = useState([]);
const [eventForm, setEventForm] = useState({
  title: '', 
  description: '', 
  theme: '', 
  start_date: '', 
  end_date: '', 
  max_participants: 20, 
  min_words: 500,
  max_words: 2000,
  image_url: '', 
  is_active: true
});
const [editingEventId, setEditingEventId] = useState(null);
const [uploadingEventImage, setUploadingEventImage] = useState(false);
const [loadingEvents, setLoadingEvents] = useState(false);
  // VERİ ÇEKME FONKSİYONLARI
  const fetchUsers = useCallback(async (query = '', pageNum = 1) => {
    setLoadingUsers(true);
    const from = (pageNum - 1) * USERS_PER_PAGE;
    const to = from + USERS_PER_PAGE - 1;

    let supabaseQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query) supabaseQuery = supabaseQuery.ilike('username', `%${query}%`);

    const { data, error, count } = await supabaseQuery;
    if (!error) {
      setUsers(data || []);
      setTotalUsers(count || 0);
      setTotalPages(Math.ceil((count || 0) / USERS_PER_PAGE));
    }
    setLoadingUsers(false);
  }, [USERS_PER_PAGE]);

  const fetchReports = useCallback(async (pageNum = 1) => {
    setLoadingReports(true);
    const from = (pageNum - 1) * REPORTS_PER_PAGE;
    const to = from + REPORTS_PER_PAGE - 1;

    let query = supabase
      .from('reports')
      .select('*, reporter:profiles!reporter_id(username, full_name, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (reportFilter !== 'all') query = query.eq('status', reportFilter);

    const { data, error, count } = await query;
    if (!error) {
      setReports(data || []);
      setTotalReports(count || 0);
      setTotalReportPages(Math.ceil((count || 0) / REPORTS_PER_PAGE));
    }
    setLoadingReports(false);
  }, [reportFilter, REPORTS_PER_PAGE]);

  const fetchSupport = useCallback(async (pageNum = 1) => {
    setLoadingSupport(true);
    const from = (pageNum - 1) * SUPPORT_PER_PAGE;
    const to = from + SUPPORT_PER_PAGE - 1;

    let query = supabase
      .from('support_messages')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (supportFilter !== 'all') query = query.eq('status', supportFilter);

    const { data, error, count } = await query;
    if (!error) {
      setSupportMessages(data || []);
      setTotalSupport(count || 0);
      setTotalSupportPages(Math.ceil((count || 0) / SUPPORT_PER_PAGE));
    } else {
      toast.error('Destek mesajları alınamadı');
    }
    setLoadingSupport(false);
  }, [supportFilter, SUPPORT_PER_PAGE]);

  const fetchBannedWords = useCallback(async () => {
    setLoadingBanned(true);
    const { data, error } = await supabase
      .from('banned_words')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setBannedWords(data || []);
    } else {
      toast.error('Yasaklı kelimeler yüklenemedi');
    }
    setLoadingBanned(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('priority', { ascending: false });

    if (!error) {
      setCategories(data || []);
    } else {
      toast.error('Kategoriler yüklenemedi');
    }
    setLoadingCategories(false);
  }, []);
  const fetchEvents = useCallback(async () => {
  setLoadingEvents(true);
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_participants(count)
    `)
    .order('created_at', { ascending: false });
  
  if (!error) {
    // Her etkinlik için katılımcı sayısını ekle
    const eventsWithCount = (data || []).map(event => ({
      ...event,
      participant_count: event.event_participants?.[0]?.count || 0
    }));
    setEvents(eventsWithCount);
  } else {
    toast.error('Etkinlikler yüklenemedi');
  }
  setLoadingEvents(false);
}, []);

  const loadData = useCallback(async () => {
    if (activeTab === 'duyurular') {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      setDuyurular(data || []);
    } else if (activeTab === 'kullanicilar') {
      fetchUsers(searchQuery, 1);
    } else if (activeTab === 'sikayetler') {
      fetchReports(1);
    } else if (activeTab === 'destek') {
      fetchSupport(1);
    } else if (activeTab === 'yasakli') {
      fetchBannedWords();
    } else if (activeTab === 'kategoriler') {
      fetchCategories();
    }
     else if (activeTab === 'etkinlikler') {
    fetchEvents(); 
  }
  }, [activeTab, searchQuery, fetchUsers, fetchReports, fetchSupport, fetchBannedWords, fetchCategories,fetchEvents]);

  useEffect(() => { checkAdmin(); }, []);
  useEffect(() => { if (isAdmin) loadData(); }, [activeTab, isAdmin, loadData]);

  useEffect(() => {
    if (activeTab === 'kullanicilar') {
      const delay = setTimeout(() => fetchUsers(searchQuery, page), 500);
      return () => clearTimeout(delay);
    }
  }, [searchQuery, page, activeTab, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'sikayetler') fetchReports(reportPage);
  }, [reportFilter, reportPage, activeTab, fetchReports]);

  useEffect(() => {
    if (activeTab === 'destek') fetchSupport(supportPage);
  }, [supportFilter, supportPage, activeTab, fetchSupport]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/giris');
    setAdminEmail(user.email);
    const { data: admin } = await supabase.from('announcement_admins').select().eq('user_email', user.email).single();
    if (!admin) { toast.error('Yetkisiz!'); return router.push('/'); }
    setIsAdmin(true); setLoading(false);
  }

  const navigateToTarget = (type, id) => {
    let url = null;
    switch (type) {
      case 'book':
        url = `/kitap/${id}`;
        break;
      case 'chapter':
      case 'comment':
      case 'pano_comment':
      case 'user':
      default:
        // Bu tiplerde direkt link yok, sessizce geç
        return;
    }
    if (url) window.open(url, '_blank');
  }
  // YASAKLI KELİME İŞLEMLERİ
  async function addBannedWord() {
    if (!newWord.trim()) {
      toast.error('Kelime boş olamaz!');
      return;
    }
    const exists = bannedWords.some(w => w.word.toLowerCase() === newWord.toLowerCase());
    if (exists) {
      toast.error('Bu kelime zaten listede!');
      return;
    }
    const { error } = await supabase
      .from('banned_words')
      .insert([{ word: newWord.toLowerCase().trim(), created_by: adminEmail, is_active: true }]);
    if (error) {
      toast.error('Eklenirken hata oluştu: ' + error.message);
    } else {
      toast.success('✅ Yasaklı kelime eklendi!');
      setNewWord('');
      fetchBannedWords();
    }
  }

  async function toggleBannedWord(id, currentStatus) {
    const { error } = await supabase.from('banned_words').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      toast.success(currentStatus ? 'Kelime pasif edildi' : 'Kelime aktif edildi');
      fetchBannedWords();
    }
  }

  async function deleteBannedWord(id) {
    if (!confirm('Bu kelimeyi kalıcı olarak silmek istediğine emin misin?')) return;
    const { error } = await supabase.from('banned_words').delete().eq('id', id);
    if (!error) {
      toast.success('🗑️ Kelime silindi');
      fetchBannedWords();
    }
  }

  // KATEGORİ İŞLEMLERİ
  async function handleCategoryImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCategoryImage(true);
    const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
    try {
      const { error } = await supabase.storage.from('images').upload(`categories/${fileName}`, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`categories/${fileName}`);
      setCategoryForm({ ...categoryForm, image_url: publicUrl });
      toast.success('Görsel yüklendi');
    } catch (err) {
      toast.error('Hata: ' + err.message);
    } finally {
      setUploadingCategoryImage(false);
    }
  }

  async function handleCategorySubmit(e) {
    e.preventDefault();
    if (uploadingCategoryImage) return;

    const slug = categoryForm.slug || categoryForm.name.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const payload = { ...categoryForm, slug };
    const q = editingCategoryId
      ? supabase.from('categories').update(payload).eq('id', editingCategoryId)
      : supabase.from('categories').insert([payload]);

    const { error } = await q;
    if (error) {
      toast.error('Hata: ' + error.message);
    } else {
      toast.success(editingCategoryId ? 'Güncellendi' : 'Eklendi');
      setEditingCategoryId(null);
      setCategoryForm({ name: '', slug: '', image_url: '', priority: 1, is_active: true });
      fetchCategories();
    }
  }

  async function deleteCategory(id) {
    if (!confirm('Bu kategoriyi silmek istediğine emin misin?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      toast.success('Kategori silindi');
      fetchCategories();
    }
  }

  async function toggleCategory(id, currentStatus) {
    const { error } = await supabase.from('categories').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      toast.success(currentStatus ? 'Kategori pasif edildi' : 'Kategori aktif edildi');
      fetchCategories();
    }
  }

  async function toggleBan(userId, currentStatus) {
    if (!confirm(currentStatus ? "Yasak kalksın mı?" : "Banlansın mı?")) return;
    const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
    if (!error) { toast.success('İşlem tamam'); fetchUsers(searchQuery, page); }
  }

  async function updateReportStatus(id, status) {
    await supabase.from('reports').update({ status }).eq('id', id);
    toast.success('Güncellendi'); fetchReports(reportPage);
  }

  async function deleteReport(id) {
    if (!confirm('Silmek istediğine emin misin?')) return;
    await supabase.from('reports').delete().eq('id', id);
    toast.success('Silindi'); fetchReports(reportPage);
  }

  async function updateSupportStatus(id, status) {
    await supabase.from('support_messages').update({ status }).eq('id', id);
    toast.success('Durum güncellendi');
    fetchSupport(supportPage);
    if (supportModal && supportModal.id === id) setSupportModal(null);
  }

  async function deleteSupport(id) {
    if (!confirm('Bu mesajı silmek istediğine emin misin?')) return;
    await supabase.from('support_messages').delete().eq('id', id);
    toast.success('Mesaj silindi');
    fetchSupport(supportPage);
    if (supportModal && supportModal.id === id) setSupportModal(null);
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
    try {
      const { error } = await supabase.storage.from('images').upload(`announcements/${fileName}`, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`announcements/${fileName}`);
      setDuyuruForm({ ...duyuruForm, image_url: publicUrl });
      toast.success('Görsel yüklendi');
    } catch (err) { toast.error('Hata: ' + err.message); }
    finally { setUploadingImage(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (uploadingImage) return;
    const payload = { ...duyuruForm };
    const q = editingId ? supabase.from('announcements').update(payload).eq('id', editingId) : supabase.from('announcements').insert([payload]);
    const { error } = await q;
    if (error) toast.error('Hata: ' + error.message);
    else {
      toast.success(editingId ? 'Güncellendi' : 'Eklendi');
      setEditingId(null);
      setDuyuruForm({ title: '', content: '', type: 'bilgi', priority: 1, is_active: true, image_url: null, text_color: '#000000', display_type: 'wide', action_link: '', action_text: '' });
      loadData();
    }
  }

  async function deleteDuyuru(id) {
    if (!confirm('Silmek istediğine emin misin?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    loadData();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black">YÜKLENIYOR...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0a0a0a] py-10 px-4 transition-colors duration-300">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-black text-center dark:text-white uppercase mb-12">YÖNETİM PANELİ</h1>

        <div className="mb-10 border-b dark:border-white/10 overflow-x-auto scrollbar-hide">
          <div className="flex justify-start md:justify-center min-w-max">
            {['duyurular', 'kullanicilar', 'sikayetler', 'destek', 'yasakli', 'kategoriler', 'etkinlikler'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 md:px-6 py-4 font-black uppercase tracking-widest border-b-4 whitespace-nowrap text-xs md:text-sm ${activeTab === tab ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400'}`}>
                {tab === 'duyurular' ? '📣 Duyurular' :
                  tab === 'kullanicilar' ? '👥 Kullanıcılar' :
                    tab === 'sikayetler' ? '⚠️ Şikayetler' :
                      tab === 'destek' ? '📧 Destek' :
                        tab === 'yasakli' ? '🚫 Yasaklı' :
                          tab === 'kategoriler' ? '📚 Kategoriler' :
                            '🎯 Etkinlikler'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] rounded-[2.5rem] shadow-2xl p-8 md:p-12 border dark:border-white/5">

          {activeTab === 'duyurular' && (
            <div className="grid lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black dark:text-white uppercase">{editingId ? 'DÜZENLE' : 'YENİ DUYURU'}</h2>
                  {editingId && <button onClick={() => { setEditingId(null); setDuyuruForm({ title: '', content: '', type: 'bilgi', priority: 1, is_active: true, image_url: null, text_color: '#000000', display_type: 'wide', action_link: '', action_text: '' }); }} className="text-xs text-red-500 font-bold uppercase">İPTAL</button>}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400">FORMAT</label>
                      <select value={duyuruForm.display_type} onChange={e => setDuyuruForm({ ...duyuruForm, display_type: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-bold outline-none">
                        <option value="none">🚫 Görsel Yok</option>
                        <option value="book">📚 Kitap (Dikey)</option>
                        <option value="wide">🖼️ Geniş (Yatay)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400">TÜR</label>
                      <select value={duyuruForm.type} onChange={e => setDuyuruForm({ ...duyuruForm, type: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-bold outline-none">
                        <option value="bilgi">ℹ️ Bilgi</option>
                        <option value="mujdede">🎉 Müjde</option>
                        <option value="uyari">⚠️ Uyarı</option>
                        <option value="yenilik">🚀 Yenilik</option>
                      </select>
                    </div>
                  </div>

                  <div className="relative group">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="duyuru-gorsel" />
                    <label htmlFor="duyuru-gorsel" className="w-full max-w-md mx-auto rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer min-h-[200px] border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-black/20">
                      {duyuruForm.image_url ? <img src={duyuruForm.image_url} className="max-h-[400px] object-contain" /> : <div className="text-center p-6 text-gray-400"><Icons.Photo /><span className="text-[10px] font-black mt-2 uppercase block">Görsel Seç</span></div>}
                    </label>
                    {duyuruForm.image_url && <button type="button" onClick={() => setDuyuruForm({ ...duyuruForm, image_url: null })} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full">✕</button>}
                  </div>

                  <input type="text" placeholder="Başlık" required value={duyuruForm.title} onChange={e => setDuyuruForm({ ...duyuruForm, title: e.target.value })} className="w-full p-5 bg-gray-50 dark:bg-black/20 rounded-2xl font-black text-xl dark:text-white outline-none" />

                  <div className="flex gap-3 items-center">
                    <input type="color" value={duyuruForm.text_color} onChange={e => setDuyuruForm({ ...duyuruForm, text_color: e.target.value })} className="w-12 h-12 rounded-xl border-2" />
                    <input type="text" value={duyuruForm.text_color} onChange={e => setDuyuruForm({ ...duyuruForm, text_color: e.target.value })} className="flex-1 p-3 bg-gray-50 dark:bg-black/20 rounded-xl dark:text-white font-mono text-sm outline-none" placeholder="#000000" />
                  </div>

                  <textarea placeholder="İçerik..." required rows={4} value={duyuruForm.content} onChange={e => setDuyuruForm({ ...duyuruForm, content: e.target.value })} className="w-full p-5 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-medium outline-none" />

                  <input type="text" placeholder="Buton Yazısı (Opsiyonel)" value={duyuruForm.action_text} onChange={e => setDuyuruForm({ ...duyuruForm, action_text: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-bold outline-none" />
                  <input type="text" placeholder="Buton Linki (Opsiyonel)" value={duyuruForm.action_link} onChange={e => setDuyuruForm({ ...duyuruForm, action_link: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-mono text-sm outline-none" />

                  <button type="submit" className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all">{editingId ? 'GÜNCELLE' : 'YAYINLA'}</button>
                </form>
              </div>

              <div className="lg:col-span-3 space-y-4 max-h-[800px] overflow-y-auto pr-2 border-l dark:border-white/5 lg:pl-8">
                {duyurular.map(d => (
                  <div key={d.id} className="group p-4 rounded-2xl border dark:border-white/5 bg-gray-50 dark:bg-white/5 flex gap-4 hover:border-red-500 transition-all">
                    {d.image_url && <img src={d.image_url} className="w-16 h-20 object-cover rounded-lg bg-gray-800" />}
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <h3 className="font-bold line-clamp-1" style={{ color: d.text_color }}>{d.title}</h3>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingId(d.id); setDuyuruForm(d); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1.5 bg-blue-100 text-blue-500 rounded-lg"><Icons.Edit /></button>
                          <button onClick={() => deleteDuyuru(d.id)} className="p-1.5 bg-red-100 text-red-500 rounded-lg"><Icons.Delete /></button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{d.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'yasakli' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs font-black text-gray-400 uppercase mb-2 block">Yeni Yasaklı Kelime</label>
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBannedWord()}
                    placeholder="Kelime girin..."
                    className="w-full p-4 bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-red-600 rounded-2xl dark:text-white font-bold outline-none transition-all"
                  />
                </div>
                <button
                  onClick={addBannedWord}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase flex items-center gap-2 transition-all shadow-lg"
                >
                  <Icons.Plus /> EKLE
                </button>
              </div>

              <div className="border-t dark:border-white/10 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-black dark:text-white uppercase">Yasaklı Kelimeler Listesi</h3>
                  <span className="text-xs font-bold text-gray-400">{bannedWords.length} Kelime</span>
                </div>

                {loadingBanned ? (
                  <div className="text-center py-12 opacity-50 font-black">YÜKLENIYOR...</div>
                ) : bannedWords.length === 0 ? (
                  <div className="text-center py-12 opacity-30 font-black uppercase dark:text-white">
                    Henüz yasaklı kelime eklenmemiş
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {bannedWords.map(word => (
                      <div
                        key={word.id}
                        className={`p-4 rounded-2xl border transition-all ${word.is_active
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                            : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-60'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${word.is_active ? 'bg-red-600' : 'bg-gray-400'}`}>
                              <Icons.Ban />
                            </div>
                            <div>
                              <p className={`font-black text-lg ${word.is_active ? 'dark:text-white' : 'text-gray-400'}`}>
                                {word.word}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">
                                {new Date(word.created_at).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleBannedWord(word.id, word.is_active)}
                              className={`p-2 rounded-lg text-xs font-black ${word.is_active
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                                }`}
                              title={word.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                            >
                              {word.is_active ? '⸺' : '▶️'}
                            </button>
                            <button
                              onClick={() => deleteBannedWord(word.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg"
                              title="Sil"
                            >
                              <Icons.Delete />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'kategoriler' && (
            <div className="grid lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black dark:text-white uppercase">
                    {editingCategoryId ? 'DÜZENLE' : 'YENİ KATEGORİ'}
                  </h2>
                  {editingCategoryId && (
                    <button
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm({ name: '', slug: '', image_url: '', priority: 1, is_active: true });
                      }}
                      className="text-xs text-red-500 font-bold uppercase"
                    >
                      İPTAL
                    </button>
                  )}
                </div>

                <form onSubmit={handleCategorySubmit} className="space-y-6">
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCategoryImageUpload}
                      className="hidden"
                      id="category-image"
                    />
                    <label
                      htmlFor="category-image"
                      className="w-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer aspect-[4/3] border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-black/20 hover:border-red-600 transition-all"
                    >
                      {categoryForm.image_url ? (
                        <img
                          src={categoryForm.image_url}
                          className="w-full h-full object-cover rounded-3xl"
                          alt="Kategori görseli"
                        />
                      ) : (
                        <div className="text-center p-6 text-gray-400">
                          <Icons.Photo />
                          <span className="text-[10px] font-black mt-2 uppercase block">Görsel Seç</span>
                        </div>
                      )}
                    </label>
                    {categoryForm.image_url && (
                      <button
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, image_url: '' })}
                        className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Kategori Adı *"
                    required
                    value={categoryForm.name}
                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full p-5 bg-gray-50 dark:bg-black/20 rounded-2xl font-black text-xl dark:text-white outline-none"
                  />

                  <input
                    type="text"
                    placeholder="Slug (otomatik oluşturulur)"
                    value={categoryForm.slug}
                    onChange={e => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                    className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-mono text-sm outline-none"
                  />

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400">ÖNCELİK (Yüksek = Üstte)</label>
                    <input
                      type="number"
                      min="1"
                      value={categoryForm.priority}
                      onChange={e => setCategoryForm({ ...categoryForm, priority: parseInt(e.target.value) })}
                      className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-bold outline-none"
                    />
                  </div>

                  <button type="submit" className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all">
                    {editingCategoryId ? 'GÜNCELLE' : 'EKLE'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-3 space-y-4 max-h-[800px] overflow-y-auto pr-2 border-l dark:border-white/5 lg:pl-8">
                {loadingCategories ? (
                  <div className="text-center py-12 opacity-50 font-black">YÜKLENIYOR...</div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-12 opacity-30 font-black uppercase dark:text-white">
                    Henüz kategori eklenmemiş
                  </div>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="group p-4 rounded-2xl border dark:border-white/5 bg-gray-50 dark:bg-white/5 flex gap-4 hover:border-red-500 transition-all">
                      {cat.image_url && (
                        <img src={cat.image_url} className="w-20 h-20 object-cover rounded-lg bg-gray-800" alt={cat.name} />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <div>
                            <h3 className="font-black text-lg dark:text-white">{cat.name}</h3>
                            <p className="text-xs text-gray-400 font-mono">/{cat.slug}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleCategory(cat.id, cat.is_active)}
                              className={`p-2 rounded-lg text-xs font-black ${cat.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                                }`}
                              title={cat.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                            >
                              {cat.is_active ? '✓' : '○'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setCategoryForm(cat);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-2 bg-blue-100 text-blue-500 rounded-lg"
                            >
                              <Icons.Edit />
                            </button>
                            <button
                              onClick={() => deleteCategory(cat.id)}
                              className="p-2 bg-red-100 text-red-500 rounded-lg"
                            >
                              <Icons.Delete />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Öncelik: {cat.priority}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'kullanicilar' && (
            <div className="space-y-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400"><Icons.Search /></div>
                <input type="text" placeholder="KULLANICI ARA..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="w-full pl-12 pr-6 py-5 bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-red-600 rounded-2xl dark:text-white font-bold text-lg outline-none transition-all uppercase" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {users.map(u => (
                  <div key={u.id} className={`rounded-3xl p-6 border transition-all hover:shadow-xl ${u.is_banned ? 'bg-red-50 dark:bg-red-900/10 border-red-200' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white ${u.is_banned ? 'bg-red-600' : 'bg-gray-800'}`}>{u.username?.[0]?.toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-lg dark:text-white truncate">@{u.username}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase truncate">{u.full_name || 'İsimsiz'}</p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.is_banned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{u.is_banned ? '🚫 YASAKLI' : '✅ AKTİF'}</span>
                      <button onClick={() => toggleBan(u.id, u.is_banned)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${u.is_banned ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{u.is_banned ? 'YASAĞI KALDIR' : 'BANLA'}</button>
                    </div>
                  </div>
                ))}
              </div>

              {totalUsers > USERS_PER_PAGE && (
                <div className="flex justify-between items-center mt-6 border-t pt-4 dark:border-white/10">
                  <span className="text-xs font-bold text-gray-400">Toplam: {totalUsers}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-black disabled:opacity-50">ÖNCEKİ</button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-black disabled:opacity-50">SONRAKİ</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sikayetler' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'resolved', 'rejected'].map(f => (
                  <button key={f} onClick={() => { setReportFilter(f); setReportPage(1); }} className={`px-4 py-2 rounded-xl font-black uppercase text-xs ${reportFilter === f ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                    {f === 'all' ? 'Tümü' : f === 'pending' ? 'Bekleyen' : f === 'resolved' ? 'Çözüldü' : 'Reddedildi'}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {reports.map(r => (
                  <div key={r.id} className="p-6 rounded-2xl border dark:border-white/5 bg-white dark:bg-white/5 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-3 items-start flex-1">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-full text-xs font-black uppercase shrink-0">
                          {getTargetEmoji(r.target_type)} {r.target_type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold dark:text-white">@{r.reporter?.username || 'Anonim'}</span>
                            <span className="text-xs text-gray-400">tarafından şikayet edildi</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {new Date(r.created_at).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          r.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {r.status}
                      </span>
                    </div>

                    {/* ŞİKAYET EDİLEN İÇERİK BİLGİSİ */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl mb-4 border-l-4 border-blue-500">
                      <p className="text-xs font-black text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-widest">
                        📌 Şikayet Edilen İçerik
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm dark:text-white font-bold">
                          Tür: <span className="text-red-600">{r.target_type}</span>
                        </p>
                        <p className="text-sm dark:text-white font-bold">
                          ID: <span className="font-mono text-gray-500">#{r.target_id}</span>
                        </p>
                      </div>
                    </div>

                    {/* ŞİKAYET SEBEBİ */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl mb-4 border-l-4 border-red-500">
                      <p className="text-xs font-black text-red-600 mb-2 uppercase tracking-widest">🚨 Şikayet Sebebi</p>
                      <p className="text-sm dark:text-white font-medium">{r.reason}</p>
                    </div>

                    {/* İÇERİK ÖRNEĞİ */}
                    {r.content_snapshot && (
                      <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-l-4 border-orange-500">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                          📄 İçerik Örneği:
                        </p>
                        <p className="text-sm dark:text-white line-clamp-3 italic">
                          "{r.content_snapshot}"
                        </p>
                      </div>
                    )}

                    {/* BUTONLAR */}
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={async () => {
                          let url = null;

                          if (r.target_type === 'book') {
                            url = `/kitap/${r.target_id}`;
                          }
                          else if (r.target_type === 'chapter') {
                            // Bölüm için book_id'yi bulmamız lazım
                            const { data: chapter } = await supabase
                              .from('chapters')
                              .select('book_id')
                              .eq('id', r.target_id)
                              .single();

                            if (chapter) {
                              url = `/kitap/${chapter.book_id}/bolum/${r.target_id}`;
                            }
                          }
                          else if (r.target_type === 'comment') {
                            // Yorum için book_id ve chapter_id'yi bulmamız lazım
                            const { data: comment } = await supabase
                              .from('comments')
                              .select('book_id, chapter_id')
                              .eq('id', r.target_id)
                              .single();

                            if (comment) {
                              if (comment.chapter_id) {
                                url = `/kitap/${comment.book_id}/bolum/${comment.chapter_id}`;
                              } else {
                                url = `/kitap/${comment.book_id}`;
                              }
                            }
                          }
                          else if (r.target_type === 'pano_comment') {
                            // Pano yorumu için pano_id'yi bul ve o panoya git
                            const { data: panoComment } = await supabase
                              .from('pano_comments')
                              .select('pano_id')
                              .eq('id', r.target_id)
                              .single();

                            if (panoComment) {
                              url = `/pano/${panoComment.pano_id}`;
                            }
                          }

                          if (url) {
                            window.open(url, '_blank');
                          } else {
                            toast.error('İçerik bulunamadı veya silinmiş!');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black shadow-sm transition-all"
                      >
                        🔗 İNCELE
                      </button>
                      {r.status !== 'resolved' && (
                        <button
                          onClick={() => updateReportStatus(r.id, 'resolved')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-black transition-all"
                        >
                          ✅ ÇÖZ
                        </button>
                      )}
                      {r.status !== 'rejected' && (
                        <button
                          onClick={() => updateReportStatus(r.id, 'rejected')}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-black transition-all"
                        >
                          ❌ REDDET
                        </button>
                      )}
                      <button
                        onClick={() => deleteReport(r.id)}
                        className="px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 text-gray-700 dark:text-white rounded-lg text-xs font-black transition-all"
                      >
                        🗑️ SİL
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'destek' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  {[
                    { val: 'all', label: 'TÜMÜ' },
                    { val: 'new', label: 'YENİ' },
                    { val: 'in_progress', label: 'İŞLENİYOR' },
                    { val: 'resolved', label: 'ÇÖZÜLDÜ' }
                  ].map(f => (
                    <button key={f.val} onClick={() => { setSupportFilter(f.val); setSupportPage(1); }} className={`px-4 py-2 rounded-xl font-black uppercase text-xs ${supportFilter === f.val ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-400">{totalSupport} Mesaj</span>
              </div>

              <div className="grid gap-4">
                {supportMessages.length === 0 ? (
                  <div className="text-center py-20 opacity-30 font-black uppercase dark:text-white">Mesaj bulunamadı</div>
                ) : (
                  supportMessages.map(item => (
                    <div key={item.id} className="p-6 rounded-2xl border dark:border-white/5 bg-white dark:bg-white/5 hover:shadow-xl transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-black text-lg dark:text-white">{item.full_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'new' ? 'bg-blue-100 text-blue-700' : item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {item.status === 'new' ? '🔵 YENİ' : item.status === 'in_progress' ? '⏳ İŞLENİYOR' : '✅ ÇÖZÜLDÜ'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-500 mb-1">{item.subject}</p>
                        <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('tr-TR')} • {item.email}</p>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setSupportModal(item)} className="px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl text-xs font-black dark:text-white">📄 OKU</button>
                        <button onClick={() => deleteSupport(item.id)} className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-xl text-xs font-black">🗑️ SİL</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {totalSupport > SUPPORT_PER_PAGE && (
                <div className="flex justify-between items-center mt-6 border-t pt-4 dark:border-white/10">
                  <span className="text-xs font-bold text-gray-400">Sayfa {supportPage} / {totalSupportPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSupportPage(p => Math.max(1, p - 1))} disabled={supportPage === 1} className="px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-black disabled:opacity-50">ÖNCEKİ</button>
                    <button onClick={() => setSupportPage(p => Math.min(totalSupportPages, p + 1))} disabled={supportPage >= totalSupportPages} className="px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-black disabled:opacity-50">SONRAKİ</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'etkinlikler' && (
  <div className="grid lg:grid-cols-5 gap-12">
    {/* SOL TARAF - FORM */}
    <div className="lg:col-span-2 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black dark:text-white uppercase">
          {editingEventId ? 'DÜZENLENİYOR' : 'YENİ ETKİNLİK'}
        </h2>
        {editingEventId && (
          <button
            onClick={() => {
              setEditingEventId(null);
              setEventForm({
                title: '', description: '', theme: '', start_date: '', 
                end_date: '', max_participants: 20, image_url: '', is_active: true
              });
            }}
            className="text-xs text-red-500 font-bold uppercase"
          >
            İPTAL
          </button>
        )}
      </div>

      <form onSubmit={async (e) => {
        e.preventDefault();
        if (uploadingEventImage) return;
        
        if (!eventForm.title.trim() || !eventForm.description.trim()) {
          toast.error('Başlık ve açıklama gerekli!');
          return;
        }
        if (!eventForm.start_date || !eventForm.end_date) {
          toast.error('Tarihler gerekli!');
          return;
        }
        if (new Date(eventForm.end_date) <= new Date(eventForm.start_date)) {
          toast.error('Bitiş tarihi başlangıçtan sonra olmalı!');
          return;
        }
        if (!eventForm.min_words || !eventForm.max_words || eventForm.min_words >= eventForm.max_words) {
          toast.error('Kelime sınırlarını doğru gir! Min, max\'tan küçük olmalı.');
          return;
        }

        const payload = { ...eventForm, created_by: adminEmail };
        const q = editingEventId 
          ? supabase.from('events').update(payload).eq('id', editingEventId)
          : supabase.from('events').insert([payload]);
        
        const { error } = await q;
        if (error) {
          toast.error('Hata: ' + error.message);
        } else {
          toast.success(editingEventId ? '✅ Güncellendi' : '🎉 Etkinlik oluşturuldu!');
          setEditingEventId(null);
          setEventForm({
            title: '', description: '', theme: '', start_date: '', 
            end_date: '', max_participants: 20, min_words: 500, max_words: 2000, image_url: '', is_active: true
          });
          fetchEvents();
        }
      }} className="space-y-6">
        
        {/* GÖRSEL YÜKLEME */}
        <div className="relative group">
          <input 
            type="file" 
            accept="image/*" 
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              setUploadingEventImage(true);
              const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
              try {
                const { error } = await supabase.storage.from('images').upload(`events/${fileName}`, file);
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`events/${fileName}`);
                setEventForm({ ...eventForm, image_url: publicUrl });
                toast.success('Görsel yüklendi');
              } catch (err) {
                toast.error('Hata: ' + err.message);
              } finally {
                setUploadingEventImage(false);
              }
            }}
            className="hidden" 
            id="event-image" 
          />
          <label 
            htmlFor="event-image" 
            className="w-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer aspect-video border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-black/20 hover:border-red-600 transition-all"
          >
            {eventForm.image_url ? (
              <img src={eventForm.image_url} className="w-full h-full object-cover rounded-3xl" alt="Etkinlik kapak" />
            ) : (
              <div className="text-center p-6 text-gray-400">
                <Icons.Photo />
                <span className="text-[10px] font-black mt-2 uppercase block">Kapak Görseli Seç</span>
              </div>
            )}
          </label>
          {eventForm.image_url && (
            <button 
              type="button" 
              onClick={() => setEventForm({...eventForm, image_url: ''})} 
              className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full"
            >
              ✕
            </button>
          )}
        </div>

        <input 
          type="text" 
          placeholder="Etkinlik Başlığı *" 
          required 
          value={eventForm.title} 
          onChange={e => setEventForm({...eventForm, title: e.target.value})} 
          className="w-full p-5 bg-gray-50 dark:bg-black/20 rounded-2xl font-black text-xl dark:text-white outline-none" 
        />

        <textarea 
          placeholder="Açıklama *" 
          required 
          rows={4}
          value={eventForm.description} 
          onChange={e => setEventForm({...eventForm, description: e.target.value})} 
          className="w-full p-5 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-medium outline-none" 
        />

        <input 
          type="text" 
          placeholder="Tema/Konu (örn: Bahar, Macera, Aşk)" 
          value={eventForm.theme} 
          onChange={e => setEventForm({...eventForm, theme: e.target.value})} 
          className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white outline-none" 
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase">Başlangıç *</label>
            <input 
              type="datetime-local" 
              required
              value={eventForm.start_date} 
              onChange={e => setEventForm({...eventForm, start_date: e.target.value})} 
              className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-mono text-sm outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase">Bitiş *</label>
            <input 
              type="datetime-local" 
              required
              value={eventForm.end_date} 
              onChange={e => setEventForm({...eventForm, end_date: e.target.value})} 
              className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-mono text-sm outline-none" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase">Maksimum Katılımcı</label>
          <input 
            type="number" 
            min="1" 
            max="100"
            value={eventForm.max_participants} 
            onChange={e => setEventForm({...eventForm, max_participants: parseInt(e.target.value)})} 
            className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-bold outline-none" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase">Min. Kelime Sayısı</label>
            <input 
              type="number" 
              min="1"
              value={eventForm.min_words} 
              onChange={e => setEventForm({...eventForm, min_words: e.target.value === '' ? '' : parseInt(e.target.value)})} 
              className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-bold outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase">Max. Kelime Sayısı</label>
            <input 
              type="number" 
              min="1"
              value={eventForm.max_words} 
              onChange={e => setEventForm({...eventForm, max_words: e.target.value === '' ? '' : parseInt(e.target.value)})} 
              className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl dark:text-white font-bold outline-none" 
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-black/20 rounded-2xl">
          <input 
            type="checkbox" 
            id="event-active"
            checked={eventForm.is_active} 
            onChange={e => setEventForm({...eventForm, is_active: e.target.checked})} 
            className="w-5 h-5 rounded"
          />
          <label htmlFor="event-active" className="text-sm font-bold dark:text-white cursor-pointer">
            Etkinlik Aktif (Kullanıcılar görebilir ve katılabilir)
          </label>
        </div>

        <button 
          type="submit" 
          disabled={uploadingEventImage}
          className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all disabled:opacity-50"
        >
          {uploadingEventImage ? 'GÖRSEL YÜKLENİYOR...' : editingEventId ? 'GÜNCELLE' : '🎯 ETKİNLİK OLUŞTUR'}
        </button>
      </form>
    </div>

    {/* SAĞ TARAF - LİSTE */}
    <div className="lg:col-span-3 space-y-4 max-h-[800px] overflow-y-auto pr-2 border-l dark:border-white/5 lg:pl-8">
      {loadingEvents ? (
        <div className="text-center py-12 opacity-50 font-black">YÜKLENİYOR...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 opacity-30 font-black uppercase dark:text-white">
          Henüz etkinlik oluşturulmamış
        </div>
      ) : (
        events.map(event => (
          <div key={event.id} className="group p-4 rounded-2xl border dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:border-red-500 transition-all">
            <div className="flex gap-4">
              {event.image_url && (
                <img src={event.image_url} className="w-32 h-20 object-cover rounded-lg bg-gray-800 shrink-0" alt={event.title} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-lg dark:text-white truncate">{event.title}</h3>
                    {event.theme && (
                      <p className="text-xs text-gray-500 mt-1">🎨 {event.theme}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => {
                        setEditingEventId(event.id);
                        setEventForm({
                          title: event.title,
                          description: event.description,
                          theme: event.theme || '',
                          start_date: event.start_date.slice(0, 16),
                          end_date: event.end_date.slice(0, 16),
                          max_participants: event.max_participants,
                          min_words: event.min_words || 500,
                          max_words: event.max_words || 2000,
                          image_url: event.image_url || '',
                          is_active: event.is_active
                        });
                        window.scrollTo({top:0, behavior:'smooth'});
                      }}
                      className="p-2 bg-blue-100 text-blue-500 rounded-lg shrink-0"
                    >
                      <Icons.Edit />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Bu etkinliği silmek istediğine emin misin? Tüm katılımcı verileri de silinecek!')) return;
                        await supabase.from('events').delete().eq('id', event.id);
                        toast.success('🗑️ Etkinlik silindi');
                        fetchEvents();
                      }}
                      className="p-2 bg-red-100 text-red-500 rounded-lg shrink-0"
                    >
                      <Icons.Delete />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{event.description}</p>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`px-3 py-1 rounded-full font-black ${event.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {event.is_active ? '✅ AKTİF' : '⏸️ PASİF'}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-black">
                    👥 {event.participant_count || 0}/{event.max_participants}
                  </span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-black">
                    ✍️ {event.min_words || 500}–{event.max_words || 2000} kelime
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-mono text-[10px]">
                    📅 {new Date(event.start_date).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)}

        </div>
      </div>

      {supportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSupportModal(null)}>
          <div className="bg-white dark:bg-[#111] rounded-3xl p-8 max-w-2xl w-full shadow-2xl border dark:border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black dark:text-white">{supportModal.full_name}</h2>
                <p className="text-sm text-gray-500">{supportModal.email}</p>
              </div>
              <button onClick={() => setSupportModal(null)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full">✕</button>
            </div>

            <div className="mb-6">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">KONU</span>
              <p className="text-lg font-bold dark:text-white mb-4">{supportModal.subject}</p>

              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">MESAJ</span>
              <div className="p-4 bg-gray-50 dark:bg-black/30 rounded-2xl mt-1 max-h-60 overflow-y-auto">
                <p className="text-sm dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{supportModal.message}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-white/10">
              <button onClick={() => updateSupportStatus(supportModal.id, 'in_progress')} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-black text-xs uppercase">⏳ İŞLEMDE</button>
              <button onClick={() => updateSupportStatus(supportModal.id, 'resolved')} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase">✅ ÇÖZÜLDÜ</button>
              <button onClick={() => deleteSupport(supportModal.id)} className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-black text-xs uppercase">🗑️ SİL</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}