'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

// İKONLAR
const Icons = {
  Search: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>),
  Photo: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 6v12a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>),
  Delete: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
  Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>),
  Report: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg>),
};

export default function AdminPanel() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('duyurular'); // 'duyurular', 'kullanicilar', 'sikayetler'
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  // STATES
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  
  const [duyurular, setDuyurular] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]); // Yeni Şikayetler State'i
  
  // Duyuru Form
  const [editingId, setEditingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [duyuruForm, setDuyuruForm] = useState({
    title: '', content: '', type: 'info', priority: 1, is_active: true, 
    image_url: null, text_color: '#000000'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => { checkAdmin(); }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/giris'); return; }

    const { data: adminData } = await supabase.from('announcement_admins').select('*').eq('user_email', user.email).single();
    if (!adminData) { toast.error('Admin değilsin!'); router.push('/'); return; }

    setIsAdmin(true);
    setLoading(false);
    loadData();
  }

  async function loadData() {
    if (activeTab === 'duyurular') {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      setDuyurular(data || []);
    } 
    else if (activeTab === 'kullanicilar') {
      fetchUsers(searchQuery, 1);
    }
    else if (activeTab === 'sikayetler') {
      fetchReports();
    }
  }

  // --- ŞİKAYETLERİ ÇEK ---
  async function fetchReports() {
    setLoadingData(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*, profiles:reporter_id(username)')
      .order('created_at', { ascending: false });
    
    if(error) console.error(error);
    setReports(data || []);
    setLoadingData(false);
  }

  // ŞİKAYET İŞLEMLERİ
  async function resolveReport(reportId, action) {
    if (action === 'delete_content') {
        // Önce raporu bul
        const report = reports.find(r => r.id === reportId);
        if(report.target_type === 'comment') {
            await supabase.from('comments').delete().eq('id', report.target_id);
            toast.success("Yorum silindi.");
        }
        // Raporu çözüldü yap
        await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    } 
    else if (action === 'dismiss') {
        // Yoksay
        await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
        toast.success("Şikayet yoksayıldı.");
    }
    fetchReports();
  }

  // --- KULLANICI FONKSİYONLARI ---
  async function fetchUsers(query = '', pageNum = 1) {
    setLoadingData(true);
    const from = (pageNum - 1) * USERS_PER_PAGE;
    const to = from + USERS_PER_PAGE - 1;

    let supabaseQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query) supabaseQuery = supabaseQuery.ilike('username', `%${query}%`);

    const { data, count } = await supabaseQuery;
    setUsers(data || []);
    setTotalUsers(count || 0);
    setTotalPages(Math.ceil((count || 0) / USERS_PER_PAGE));
    setLoadingData(false);
  }

  useEffect(() => {
    if (activeTab === 'kullanicilar') {
      const delayDebounceFn = setTimeout(() => { fetchUsers(searchQuery, page); }, 500); 
      return () => clearTimeout(delayDebounceFn);
    }
    if (activeTab === 'sikayetler') fetchReports();
  }, [searchQuery, page, activeTab]);

  function handleSearchChange(val) { setSearchQuery(val); setPage(1); }
  
  async function toggleBan(userId, currentStatus) {
    if (!confirm(currentStatus ? "Yasağı kaldır?" : "BANLA?")) return;
    await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
    toast.success("İşlem tamam.");
    fetchUsers(searchQuery, page);
  }

  // --- DUYURU İŞLEMLERİ (Önceki kodların aynısı, kısaltıldı) ---
  async function handleImageUpload(e) { /* ...resim yükleme kodu... */ }
  async function handleSubmit(e) { e.preventDefault(); /* ...kaydetme kodu... */ }
  async function deleteDuyuru(id) { await supabase.from('announcements').delete().eq('id', id); loadData(); }
  
  // -- RENDER ---
  if (loading) return <div className="min-h-screen flex items-center justify-center">YÜKLENİYOR...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0a0a0a] py-10 px-4">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black text-center dark:text-white mb-2 uppercase">Yönetim Paneli</h1>

        {/* TAB MENÜ */}
        <div className="flex justify-center mb-10 border-b dark:border-white/10 gap-4">
          {['duyurular', 'kullanicilar', 'sikayetler'].map((tab) => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-4 font-black uppercase tracking-widest border-b-4 transition-all ${activeTab === tab ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
             >
                {tab === 'duyurular' ? '📣 Duyurular' : tab === 'kullanicilar' ? '👥 Kullanıcılar' : '🚨 Şikayetler'}
             </button>
          ))}
        </div>

        <div className="bg-white dark:bg-[#111] rounded-[2.5rem] shadow-2xl p-8 border dark:border-white/5">
          
          {/* --- DUYURULAR --- */}
          {activeTab === 'duyurular' && (
             <div className="text-center text-gray-400">Duyuru kodların burada çalışacak... (Eski kodlarını buraya yapıştırabilirsin veya önceki mesajımdaki tam halini kullan)</div>
          )}

          {/* --- KULLANICILAR --- */}
          {activeTab === 'kullanicilar' && (
            <div className="space-y-6">
              <input type="text" placeholder="Kullanıcı Ara..." value={searchQuery} onChange={e => handleSearchChange(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {users.map(u => (
                    <div key={u.id} className="p-4 border rounded-2xl flex justify-between items-center dark:border-white/10">
                       <div>
                          <p className="font-bold dark:text-white">@{u.username}</p>
                          <span className={`text-[10px] px-2 py-1 rounded ${u.is_banned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{u.is_banned ? 'YASAKLI' : 'AKTİF'}</span>
                       </div>
                       <button onClick={() => toggleBan(u.id, u.is_banned)} className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-xs font-bold">{u.is_banned ? 'AÇ' : 'BANLA'}</button>
                    </div>
                 ))}
              </div>
              {/* Sayfalama Butonları */}
              <div className="flex justify-between pt-4">
                 <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>Önceki</button>
                 <span>Sayfa {page}</span>
                 <button onClick={() => setPage(p => p+1)} disabled={page>=totalPages}>Sonraki</button>
              </div>
            </div>
          )}

          {/* --- ŞİKAYETLER (YENİ) --- */}
          {activeTab === 'sikayetler' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black dark:text-white">Gelen Şikayetler</h2>
              {reports.length === 0 ? <p className="text-gray-400">Hiç şikayet yok, her şey yolunda! 🎉</p> : (
                <div className="space-y-4">
                  {reports.map(report => (
                    <div key={report.id} className={`p-6 rounded-2xl border dark:border-white/10 ${report.status === 'pending' ? 'bg-red-50 dark:bg-red-900/10 border-red-200' : 'opacity-50 grayscale'}`}>
                       <div className="flex justify-between mb-2">
                          <span className="text-xs font-bold text-red-500 uppercase">🚩 {report.reason}</span>
                          <span className="text-[10px] text-gray-400">{new Date(report.created_at).toLocaleDateString('tr-TR')}</span>
                       </div>
                       
                       <div className="bg-white dark:bg-black/30 p-4 rounded-xl mb-4 text-sm italic text-gray-600 dark:text-gray-300">
                          "{report.content_snapshot || 'İçerik silinmiş veya bulunamadı.'}"
                       </div>

                       <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-400">Raporlayan: @{report.profiles?.username || 'Bilinmiyor'}</p>
                          
                          {report.status === 'pending' && (
                            <div className="flex gap-2">
                               <button onClick={() => resolveReport(report.id, 'dismiss')} className="px-4 py-2 bg-gray-200 dark:bg-white/10 rounded-lg text-xs font-bold">Yoksay</button>
                               <button onClick={() => resolveReport(report.id, 'delete_content')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">İÇERİĞİ SİL & KAPAT</button>
                            </div>
                          )}
                          {report.status !== 'pending' && <span className="font-bold text-xs uppercase text-gray-400">Çözüldü ({report.status})</span>}
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}