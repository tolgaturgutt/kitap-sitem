'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

// İKONLAR
const Icons = {
  Search: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>),
  Photo: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 6v12a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>),
  Delete: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
  Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>),
};

const getTargetEmoji = (type) => {
  const map = {
    'user': '👤',
    'comment': '💬',
    'book': '📖',
    'review': '⭐',
    'chapter': '📄',
    'default': '🎯'
  };
  return map[type] || map.default;
};

export default function AdminPanel() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('duyurular');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  // KULLANICI SAYFALAMA
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  // ŞİKAYET STATE
  const [reports, setReports] = useState([]);
  const [reportPage, setReportPage] = useState(1);
  const [totalReportPages, setTotalReportPages] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [reportFilter, setReportFilter] = useState('pending');
  const REPORTS_PER_PAGE = 15;
  const [loadingReports, setLoadingReports] = useState(false);

  // DUYURU STATE
  const [duyurular, setDuyurular] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [duyuruForm, setDuyuruForm] = useState({
    title: '', content: '', type: 'info', priority: 1, is_active: true, 
    image_url: null, text_color: '#000000'
  });

  // KULLANICI STATE
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ✅ useCallback ile fonksiyonları stabilize et
  const fetchUsers = useCallback(async (query = '', pageNum = 1) => {
    setLoadingUsers(true);
    
    const from = (pageNum - 1) * USERS_PER_PAGE;
    const to = from + USERS_PER_PAGE - 1;

    let supabaseQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query) {
      supabaseQuery = supabaseQuery.ilike('username', `%${query}%`);
    }

    const { data, error, count } = await supabaseQuery;
    
    if (error) {
      console.error('Kullanıcı çekme hatası:', error.message);
      toast.error('Kullanıcılar yüklenemedi: ' + error.message);
    } else {
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

    if (reportFilter !== 'all') {
      query = query.eq('status', reportFilter);
    }

    const { data, error, count } = await query;
    
    if (error) {
      console.error('Şikayet hatası:', error);
      toast.error('Şikayetler yüklenemedi: ' + error.message);
    } else {
      setReports(data || []);
      setTotalReports(count || 0);
      setTotalReportPages(Math.ceil((count || 0) / REPORTS_PER_PAGE));
    }
    setLoadingReports(false);
  }, [reportFilter, REPORTS_PER_PAGE]);

  const loadData = useCallback(async () => {
    if (activeTab === 'duyurular') {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      setDuyurular(data || []);
    } 
    else if (activeTab === 'kullanicilar') {
      fetchUsers(searchQuery, 1);
    }
    else if (activeTab === 'sikayetler') {
      fetchReports(1);
    }
  }, [activeTab, searchQuery, fetchUsers, fetchReports]);

  // ✅ İlk yükleme
  useEffect(() => { 
    checkAdmin(); 
  }, []);

  // ✅ Tab değiştiğinde veri yükle
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [activeTab, isAdmin, loadData]);

  // ✅ Kullanıcı araması için debounce
  useEffect(() => {
    if (activeTab === 'kullanicilar') {
      const delayDebounceFn = setTimeout(() => {
        fetchUsers(searchQuery, page);
      }, 500); 
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, page, activeTab, fetchUsers]);

  // ✅ Şikayet filtreleme
  useEffect(() => {
    if (activeTab === 'sikayetler') {
      fetchReports(reportPage);
    }
  }, [reportFilter, reportPage, activeTab, fetchReports]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      router.push('/giris'); 
      return; 
    }

    const { data: adminData } = await supabase
      .from('announcement_admins')
      .select('*')
      .eq('user_email', user.email)
      .single();
      
    if (!adminData) { 
      toast.error('Admin değilsin!'); 
      router.push('/'); 
      return; 
    }

    setIsAdmin(true);
    setLoading(false);
  }

  function handleSearchChange(val) {
    setSearchQuery(val);
    setPage(1);
  }

  async function toggleBan(userId, currentStatus) {
    const confirmMsg = currentStatus 
      ? "Yasağı kaldırmak istiyor musun?" 
      : "Kullanıcıyı BANLAMAK istiyor musun?";
    
    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !currentStatus })
      .eq('id', userId);

    if (error) {
      toast.error('Hata: ' + error.message);
    } else {
      toast.success(currentStatus ? 'Yasak kalktı.' : 'Kullanıcı yasaklandı.');
      fetchUsers(searchQuery, page);
    }
  }

  async function updateReportStatus(reportId, newStatus) {
    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', reportId);

    if (error) {
      toast.error('Hata: ' + error.message);
    } else {
      toast.success('Durum güncellendi!');
      fetchReports(reportPage);
    }
  }

  async function deleteReport(reportId) {
    if (!confirm('Bu şikayeti silmek istediğine emin misin?')) return;
    
    const { error } = await supabase.from('reports').delete().eq('id', reportId);
    
    if (error) {
      toast.error('Hata: ' + error.message);
    } else {
      toast.success('Şikayet silindi.');
      fetchReports(reportPage);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    try {
      const { error } = await supabase.storage.from('images').upload(`announcements/${fileName}`, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`announcements/${fileName}`);
      setDuyuruForm({ ...duyuruForm, image_url: publicUrl });
      toast.success('Görsel yüklendi!');
    } catch (err) { 
      toast.error('Hata: ' + err.message); 
    } finally { 
      setUploadingImage(false); 
    }
  }

  function startEdit(duyuru) {
    setEditingId(duyuru.id);
    setDuyuruForm({
      title: duyuru.title, 
      content: duyuru.content, 
      type: duyuru.type,
      priority: duyuru.priority, 
      is_active: duyuru.is_active,
      image_url: duyuru.image_url, 
      text_color: duyuru.text_color || '#000000'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (uploadingImage) return;

    const payload = { ...duyuruForm };
    let error;

    if (editingId) {
      const { error: err } = await supabase.from('announcements').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('announcements').insert([payload]);
      error = err;
    }

    if (error) {
      toast.error('Hata: ' + error.message);
    } else {
      toast.success(editingId ? 'Güncellendi!' : 'Yayınlandı!');
      setEditingId(null);
      setDuyuruForm({ 
        title: '', 
        content: '', 
        type: 'info', 
        priority: 1, 
        is_active: true, 
        image_url: null, 
        text_color: '#000000' 
      });
      loadData();
    }
  }

  async function deleteDuyuru(id) {
    if (!confirm('Silmek istediğine emin misin?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    loadData();
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-black">
      YUKLENIYOR...
    </div>
  );
  
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0a0a0a] py-10 px-4 transition-colors duration-300">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black dark:text-white uppercase tracking-tight mb-2">
            Yönetim Paneli
          </h1>
        </div>

        <div className="flex justify-center mb-10 border-b dark:border-white/10">
          <button 
            onClick={() => setActiveTab('duyurular')} 
            className={`px-8 py-4 font-black uppercase tracking-widest border-b-4 ${
              activeTab === 'duyurular' 
                ? 'border-red-600 text-red-600' 
                : 'border-transparent text-gray-400'
            }`}
          >
            📣 Duyurular
          </button>
          <button 
            onClick={() => setActiveTab('kullanicilar')} 
            className={`px-8 py-4 font-black uppercase tracking-widest border-b-4 ${
              activeTab === 'kullanicilar' 
                ? 'border-red-600 text-red-600' 
                : 'border-transparent text-gray-400'
            }`}
          >
            👥 Kullanıcılar
          </button>
          <button 
            onClick={() => setActiveTab('sikayetler')} 
            className={`px-8 py-4 font-black uppercase tracking-widest border-b-4 ${
              activeTab === 'sikayetler' 
                ? 'border-red-600 text-red-600' 
                : 'border-transparent text-gray-400'
            }`}
          >
            ⚠️ Şikayetler
          </button>
        </div>

        <div className="bg-white dark:bg-[#111] rounded-[2.5rem] shadow-2xl p-8 md:p-12 border dark:border-white/5">
          
          {activeTab === 'duyurular' && (
            <div className="grid lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black dark:text-white uppercase">
                    {editingId ? 'Düzenle' : 'Yeni Duyuru'}
                  </h2>
                  {editingId && (
                    <button 
                      onClick={() => {
                        setEditingId(null); 
                        setDuyuruForm({ 
                          title: '', 
                          content: '', 
                          type: 'info', 
                          priority: 1, 
                          is_active: true, 
                          image_url: null, 
                          text_color: '#000000' 
                        });
                      }} 
                      className="text-xs text-red-500 font-bold uppercase"
                    >
                      İptal
                    </button>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      ref={fileInputRef} 
                      className="hidden" 
                      id="duyuru-gorsel" 
                      disabled={uploadingImage} 
                    />
                    <label 
                      htmlFor="duyuru-gorsel" 
                      className={`aspect-video w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
                        duyuruForm.image_url 
                          ? 'border-red-500' 
                          : 'border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-black/20'
                      }`}
                    >
                      {duyuruForm.image_url ? (
                        <img src={duyuruForm.image_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                          <Icons.Photo />
                          <span className="text-[10px] font-black mt-2 uppercase">Görsel</span>
                        </div>
                      )}
                    </label>
                  </div>
                  
                  <input 
                    type="text" 
                    placeholder="Başlık" 
                    required 
                    value={duyuruForm.title} 
                    onChange={e => setDuyuruForm({...duyuruForm, title: e.target.value})} 
                    style={{ color: duyuruForm.text_color }}
                    className="w-full p-4 bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-red-500 rounded-xl font-bold outline-none" 
                  />
                  
                  <textarea 
                    placeholder="İçerik..." 
                    required 
                    rows={3} 
                    value={duyuruForm.content} 
                    onChange={e => setDuyuruForm({...duyuruForm, content: e.target.value})} 
                    className="w-full p-4 bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-red-500 rounded-xl dark:text-white outline-none" 
                  />
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-2 text-gray-400">
                      Başlık Rengi
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={duyuruForm.text_color} 
                        onChange={e => setDuyuruForm({...duyuruForm, text_color: e.target.value})} 
                        className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200 dark:border-white/10 p-1 bg-transparent" 
                      />
                      <span className="text-xs font-bold dark:text-gray-400 uppercase">
                        {duyuruForm.text_color}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      value={duyuruForm.type} 
                      onChange={e => setDuyuruForm({...duyuruForm, type: e.target.value})} 
                      className="p-3 bg-gray-50 dark:bg-black/20 rounded-xl dark:text-white font-bold"
                    >
                      <option value="info">Bilgi</option>
                      <option value="warning">Uyarı</option>
                      <option value="success">Başarı</option>
                      <option value="feature">Özellik</option>
                    </select>
                    <select 
                      value={duyuruForm.priority} 
                      onChange={e => setDuyuruForm({...duyuruForm, priority: parseInt(e.target.value)})} 
                      className="p-3 bg-gray-50 dark:bg-black/20 rounded-xl dark:text-white font-bold"
                    >
                      <option value="1">Normal</option>
                      <option value="2">Yüksek</option>
                      <option value="3">ACİL</option>
                    </select>
                  </div>
                  <button 
                    type="submit" 
                    disabled={uploadingImage} 
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50"
                  >
                    {editingId ? 'Güncelle' : 'Yayınla'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-3 space-y-4 max-h-[600px] overflow-y-auto pr-2 border-l dark:border-white/5 lg:pl-8">
                {duyurular.map(duyuru => (
                  <div 
                    key={duyuru.id} 
                    className="group relative p-4 rounded-2xl border dark:border-white/5 bg-gray-50 dark:bg-white/5 flex gap-4 hover:border-red-500 transition-all"
                  >
                    {duyuru.image_url && (
                      <img 
                        src={duyuru.image_url} 
                        className="w-16 h-20 object-cover rounded-lg bg-gray-800" 
                        alt="" 
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <h3 
                          className="font-bold line-clamp-1" 
                          style={{ color: duyuru.text_color }}
                        >
                          {duyuru.title}
                        </h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => startEdit(duyuru)} 
                            className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                          >
                            <Icons.Edit />
                          </button>
                          <button 
                            onClick={() => deleteDuyuru(duyuru.id)} 
                            className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                          >
                            <Icons.Delete />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {duyuru.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'kullanicilar' && (
            <div className="space-y-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                  <Icons.Search />
                </div>
                <input 
                  type="text" 
                  placeholder="Kullanıcı adı ile ara..." 
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-12 pr-6 py-5 bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-red-600 rounded-2xl dark:text-white font-bold text-lg outline-none transition-all placeholder:text-gray-400 uppercase tracking-wide"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loadingUsers ? (
                  <div className="col-span-full text-center py-20 opacity-50 font-black uppercase">
                    Aranıyor...
                  </div>
                ) : users.length === 0 ? (
                  <div className="col-span-full text-center py-20 opacity-30 font-black uppercase">
                    Kullanıcı bulunamadı
                  </div>
                ) : (
                  users.map(u => (
                    <div 
                      key={u.id} 
                      className={`relative overflow-hidden rounded-3xl p-6 border transition-all hover:shadow-xl ${
                        u.is_banned 
                          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' 
                          : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg ${
                            u.is_banned 
                              ? 'bg-red-600' 
                              : 'bg-gray-800 dark:bg-white dark:text-black'
                          }`}
                        >
                          {u.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-lg dark:text-white truncate">
                            @{u.username}
                          </h3>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest truncate">
                            {u.full_name || 'İsimsiz'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Kayıt: {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4">
                        <span 
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            u.is_banned 
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' 
                              : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300'
                          }`}
                        >
                          {u.is_banned ? 'YASAKLI 🚫' : 'AKTİF ✅'}
                        </span>
                        <button 
                          onClick={() => toggleBan(u.id, u.is_banned)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                            u.is_banned 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {u.is_banned ? 'Yasağı Kaldır' : 'BANLA'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8 flex items-center justify-between border-t dark:border-white/10 pt-6">
                <span className="text-sm font-bold text-gray-400">
                  Toplam {totalUsers} kullanıcı, Sayfa {page} / {totalPages}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1} 
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 disabled:opacity-30 font-black hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                  >
                    ÖNCEKİ
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page >= totalPages} 
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 disabled:opacity-30 font-black hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                  >
                    SONRAKİ
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sikayetler' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: 'all', label: 'Tümü', emoji: '📋' },
                    { value: 'pending', label: 'Bekleyen', emoji: '⏳' },
                    { value: 'resolved', label: 'Çözüldü', emoji: '✅' },
                    { value: 'rejected', label: 'Reddedildi', emoji: '❌' }
                  ].map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => { setReportFilter(filter.value); setReportPage(1); }}
                      className={`px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                        reportFilter === filter.value
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {filter.emoji} {filter.label}
                    </button>
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-400">
                  {totalReports} şikayet
                </span>
              </div>

              <div className="space-y-4">
                {loadingReports ? (
                  <div className="text-center py-20 opacity-50 font-black uppercase dark:text-white">
                    Yükleniyor...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-20 opacity-30 font-black uppercase dark:text-white">
                    Şikayet bulunamadı
                  </div>
                ) : (
                  reports.map(report => (
                    <div 
                      key={report.id} 
                      className="relative p-6 rounded-2xl border dark:border-white/5 bg-white dark:bg-white/5 hover:shadow-xl transition-all"
                    >
                      <div className="flex items-start justify-between mb-4 gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                              {getTargetEmoji(report.target_type)} {report.target_type}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              ID: {report.target_id}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 mb-2">
                            {report.reporter?.avatar_url ? (
                              <img 
                                src={report.reporter.avatar_url} 
                                className="w-8 h-8 rounded-full object-cover" 
                                alt="" 
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-800 dark:bg-white/20 flex items-center justify-center text-xs font-black text-white dark:text-black">
                                {report.reporter?.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold dark:text-white">
                                @{report.reporter?.username || 'Bilinmiyor'}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(report.created_at).toLocaleString('tr-TR', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <span 
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
                            report.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' 
                              : report.status === 'resolved' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          }`}
                        >
                          {report.status === 'pending' ? '⏳ BEKLEYEN' : report.status === 'resolved' ? '✅ ÇÖZÜLDÜ' : '❌ RED'}
                        </span>
                      </div>

                      <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-l-4 border-red-500">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                          Şikayet Sebebi:
                        </p>
                        <p className="text-sm dark:text-white font-medium">
                          {report.reason || 'Belirtilmemiş'}
                        </p>
                      </div>

                      {report.content_snapshot && (
                        <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-l-4 border-orange-500">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                            İçerik Örneği:
                          </p>
                          <p className="text-sm dark:text-white line-clamp-3 italic">
                            "{report.content_snapshot}"
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-white/5">
                        {report.status !== 'resolved' && (
                          <button
                            onClick={() => updateReportStatus(report.id, 'resolved')}
                            className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase transition-all shadow-lg"
                          >
                            ✅ Çöz
                          </button>
                        )}
                        {report.status !== 'rejected' && (
                          <button
                            onClick={() => updateReportStatus(report.id, 'rejected')}
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase transition-all shadow-lg"
                          >
                            ❌ Reddet
                          </button>
                        )}
                        {report.status !== 'pending' && (
                          <button
                            onClick={() => updateReportStatus(report.id, 'pending')}
                            className="px-4 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-black uppercase transition-all shadow-lg"
                          >
                            ⏳ Bekletmeye Al
                          </button>
                        )}
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="ml-auto px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-white text-xs font-black uppercase transition-all"
                        >
                          🗑️ Sil
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {reports.length > 0 && (
                <div className="flex items-center justify-between border-t dark:border-white/10 pt-6">
                  <span className="text-sm font-bold text-gray-400">
                    Sayfa {reportPage} / {totalReportPages}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setReportPage(p => Math.max(1, p - 1))} 
                      disabled={reportPage === 1}
                      className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 disabled:opacity-30 font-black hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                    >
                      ÖNCEKİ
                    </button>
                    <button 
                      onClick={() => setReportPage(p => Math.min(totalReportPages, p + 1))} 
                      disabled={reportPage >= totalReportPages}
                      className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 disabled:opacity-30 font-black hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                    >
                      SONRAKİ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}