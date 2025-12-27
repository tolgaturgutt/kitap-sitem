'use client';

import { useEffect, useState, use, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function BolumDuzenle({ params }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [ids, setIds] = useState({ kitapId: null, bolumId: null });
  const [bannedWords, setBannedWords] = useState([]);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false
  });
  const editorRef = useRef(null);
  const [editorLoaded, setEditorLoaded] = useState(false);

  // 🔴 YASAKLI KELİMELERİ VERİTABANINDAN ÇEK
  useEffect(() => {
    async function fetchBannedWords() {
      const { data } = await supabase
        .from('banned_words')
        .select('word');
      
      if (data) {
        setBannedWords(data.map(item => item.word.toLowerCase()));
      }
    }
    fetchBannedWords();
  }, []);

  // ✅ KELİME SAYISINI HESAPLA
  const wordCount = formData.content.trim() === '' ? 0 : formData.content.trim().split(/\s+/).length;

  // 🔴 YASAKLI KELİMELERİ TESPİT ET
  function findBannedWords(text) {
    if (!text || bannedWords.length === 0) return [];
    
    const words = text.toLowerCase().split(/\b/);
    const found = [];
    
    bannedWords.forEach(banned => {
      words.forEach(word => {
        if (word.includes(banned)) {
          found.push(banned);
        }
      });
    });
    
    return [...new Set(found)];
  }

  const detectedBannedInTitle = findBannedWords(formData.title);
  const detectedBannedInContent = findBannedWords(formData.content);
  const allDetectedBanned = [...new Set([...detectedBannedInTitle, ...detectedBannedInContent])];
  const hasBannedWords = allDetectedBanned.length > 0;

  // 🎨 FORMATLAMA FONKSİYONLARI
  function formatText(command, value = null) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    setTimeout(updateFormatState, 10);
  }

  // Format durumunu güncelle
  function updateFormatState() {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    });
  }

  // ✅ İçerik değişikliğini yakala - HTML'i KORU
  function handleInput() {
    if (editorRef.current) {
      // innerText'i state'e kaydet (sadece yasaklı kelime kontrolü için)
      setFormData({...formData, content: editorRef.current.innerText});
    }
    updateFormatState();
  }

  // ✅ ENTER tuşunu yakala - sadece <br> ekle
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Seçili metni al
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      
      // <br> elementi oluştur ve ekle
      const br = document.createElement('br');
      range.deleteContents();
      range.insertNode(br);
      
      // İmleci <br>'den sonraya taşı
      range.setStartAfter(br);
      range.setEndAfter(br);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // İçeriği güncelle
      handleInput();
    }
  }

  // ✅ PASTE (YAPIŞTIRMA) - GARANTİ YÖNTEM
  function handlePaste(e) {
    e.preventDefault(); // Varsayılan yapıştırmayı durdur

    // 1. Düz metin yedeğini al (Her ihtimale karşı)
    const plainText = e.clipboardData.getData('text/plain');
    
    // 2. HTML verisini al
    let html = e.clipboardData.getData('text/html');

    // Eğer HTML yoksa direkt düz metni yapıştır
    if (!html) {
      document.execCommand("insertText", false, plainText);
      handleInput();
      return;
    }

    try {
      // --- TEMİZLİK BAŞLIYOR ---
      
      // Word'ün gereksiz meta taglarını temizle
      html = html.replace(/<xml[^>]*>[\s\S]*?<\/xml>/g, "")
                 .replace(/<meta[^>]*>/g, "")
                 .replace(/<link[^>]*>/g, "")
                 .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "") // Style bloklarını içindekilerle sil
                 .replace(/<\/?(html|head|body|o:|xml)[^>]*>/gi, "");

      // Tüm etiketlerden class, style, id, align gibi özellikleri sök (Sadece etiketin kendisi kalsın)
      // Örnek: <b style="color:red"> -> <b>
      html = html.replace(/<([a-z][a-z0-9]*)[^>]*>/gi, function(match, tag) {
        // İzin verilen taglar dışındaysa, olduğu gibi döndür (aşağıda siliyoruz zaten)
        // Link (a) tagını da koruyalım
        if (['b', 'strong', 'i', 'em', 'u', 'br', 'a'].includes(tag.toLowerCase())) {
           return `<${tag}>`;
        }
        // p, div, h1 gibi blok elementlerin attribute'larını siliyoruz sadece
        return match.replace(/ (class|style|id|align|lang|dir|face|size)="[^"]*"/gi, "");
      });

      // Blok elementleri (p, div, h1..) satır sonuna (<br>) çevir
      // Açılış taglarını sil (<p> -> boşluk)
      html = html.replace(/<(div|p|h[1-6]|li|ul|ol|table|tr|td)[^>]*>/gi, "");
      // Kapanış taglarını <br> yap (</p> -> <br>)
      html = html.replace(/<\/(div|p|h[1-6]|li|ul|ol|table|tr|td)>/gi, "<br>");

      // Gereksiz span ve font taglarını tamamen kaldır (içerik kalsın)
      html = html.replace(/<\/?(span|font)[^>]*>/gi, "");

      // Çoklu <br> varsa tek'e düşür (isteğe bağlı, bazen Word 2-3 tane atar)
      // html = html.replace(/(<br\s*\/?>\s*){2,}/gi, "<br>");

      // --- TEMİZLİK BİTTİ ---

      // Temizlenmiş HTML'i yapıştır
      const success = document.execCommand("insertHTML", false, html);

      // Eğer insertHTML başarısız olursa (bazı tarayıcılar reddederse) düz metne dön
      if (!success) {
        throw new Error("HTML insert failed");
      }

    } catch (err) {
      console.log("HTML yapıştırma başarısız, düz metin yapıştırılıyor...", err);
      document.execCommand("insertText", false, plainText);
    }
    
    // State'i güncelle
    handleInput();
  }

  // 🔴 İÇERİĞİ HIGHLIGHT ET
  function highlightContent(text) {
    if (!text || bannedWords.length === 0) return text;
    
    let highlighted = text;
    bannedWords.forEach(banned => {
      const regex = new RegExp(`(${banned})`, 'gi');
      highlighted = highlighted.replace(
        regex, 
        '<mark class="bg-red-600 text-white rounded px-1 animate-pulse">$1</mark>'
      );
    });
    
    return highlighted;
  }

  // 🔴 SANSÜRLEME FONKSİYONU
  function censorContent(text) {
    let censored = text;
    bannedWords.forEach(banned => {
      const regex = new RegExp(banned, 'gi');
      censored = censored.replace(regex, '***');
    });
    return censored;
  }

  useEffect(() => {
    async function unwrapParams() {
      const unwrapped = await params;
      setIds({ kitapId: unwrapped.id, bolumId: unwrapped.bolumId });
    }
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!ids.kitapId || !ids.bolumId) return;

    async function getChapterData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("Giriş yapmalısın.");
          return router.push('/giris');
        }

        const { data: chapter, error } = await supabase
          .from('chapters')
          .select('*, books(user_email)')
          .eq('id', ids.bolumId)
          .single();

        if (error || !chapter) {
          toast.error("Bölüm bulunamadı.");
          return router.push(`/kitap/${ids.kitapId}`);
        }

        let isAdmin = false;
        const { data: adminData } = await supabase.from('announcement_admins').select('*').eq('user_email', user.email).single();
        if (adminData) isAdmin = true;

        if (chapter.books.user_email !== user?.email && !isAdmin) {
          toast.error("Bu yetkiye sahip değilsin.");
          return router.push(`/kitap/${ids.kitapId}`);
        }

        // ✅ Form data'yı set et - content için innerText al (yasaklı kelime kontrolü için)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chapter.content;
        
        setFormData({ 
          title: chapter.title, 
          content: tempDiv.innerText || tempDiv.textContent || '' 
        });
        
        setLoading(false);
        setEditorLoaded(true);
      } catch (error) {
        console.error('Hata:', error);
        toast.error("Bir hata oluştu.");
        router.push(`/kitap/${ids.kitapId}`);
      }
    }
    getChapterData();
  }, [ids, router]);

  // ✅ Editor'a içeriği yükle (formData hazır olduktan SONRA)
  useEffect(() => {
    if (editorLoaded && editorRef.current && ids.bolumId) {
      // Veritabanından gelen HTML içeriğini direkt yükle
      supabase
        .from('chapters')
        .select('content')
        .eq('id', ids.bolumId)
        .single()
        .then(result => {
          if (result.data && editorRef.current) {
            editorRef.current.innerHTML = result.data.content;
          }
        });
    }
  }, [editorLoaded, ids.bolumId]);

  async function handleUpdate(e) {
    e.preventDefault();
    
    // ✅ innerHTML kullan - formatlar korunacak
    let htmlContent = editorRef.current?.innerHTML || '';
    
    // ✅ Sadece gereksiz style, font ve span taglarını temizle (Güvenlik Önlemi)
    htmlContent = htmlContent.replace(/\s*style="[^"]*"/g, '');
    htmlContent = htmlContent.replace(/<\/?font[^>]*>/g, '');
    htmlContent = htmlContent.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '');
    // ✅ <div> taglarını <br> ile değiştir
    htmlContent = htmlContent.replace(/<div>/g, '<br>').replace(/<\/div>/g, '');
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Bölüm başlığı ve içeriği boş bırakılamaz.');
      return;
    }

    if (hasBannedWords) {
      toast.error(`⚠️ Yasaklı kelimeler tespit edildi: ${allDetectedBanned.join(', ')}`);
      return;
    }

    setUpdating(true);

    try {
      const censoredTitle = censorContent(formData.title);
      const censoredContent = censorContent(htmlContent);

      const { data, error } = await supabase
        .from('chapters')
        .update({ 
          title: censoredTitle,
          content: censoredContent,
          updated_at: new Date() 
        })
        .eq('id', ids.bolumId)
        .select(); 

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("İşlem başarısız! Yetkiniz yok veya bölüm silinmiş.");
        return;
      }

      toast.success('Bölüm güncellendi! ✅');
      setTimeout(() => {
        router.push(`/kitap/${ids.kitapId}/bolum/${ids.bolumId}`);
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast.error('Bir hata oluştu.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading || !ids.kitapId) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black opacity-10 text-5xl italic animate-pulse">
        YUKLENIYOR
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 px-6 bg-[#fcfcfc] dark:bg-[#080808]">
      <Toaster position="top-right" />

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
              {detectedBannedInTitle.length > 0 && (
                <span className="ml-2 text-red-500 text-xs animate-pulse">
                  ⚠️ Yasaklı kelime: {detectedBannedInTitle.join(', ')}
                </span>
              )}
            </label>
            <input 
              type="text"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className={`w-full p-5 bg-gray-50 dark:bg-white/5 border rounded-full outline-none focus:ring-2 ring-red-600/20 dark:text-white font-bold ${
                detectedBannedInTitle.length > 0 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'dark:border-white/5'
              }`}
              placeholder="Örn: 1. Başlangıç"
            />
            
            {detectedBannedInTitle.length > 0 && formData.title && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                  ÖNİZLEME (Yasaklı kelimeler vurgulandı):
                </p>
                <div 
                  className="text-sm font-bold"
                  dangerouslySetInnerHTML={{ __html: highlightContent(formData.title) }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-4">
              Bölüm İçeriği
              {detectedBannedInContent.length > 0 && (
                <span className="ml-2 text-red-500 text-xs animate-pulse">
                  ⚠️ Yasaklı kelime: {detectedBannedInContent.join(', ')}
                </span>
              )}
            </label>
            
            {/* 🎨 FORMATLAMA TOOLBAR */}
            <div className="mb-3 flex gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => formatText('bold')}
                className={`px-4 py-2 rounded-md font-bold transition-all select-none ${
                  activeFormats.bold
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 hover:text-white'
                }`}
                title="Kalın (Ctrl+B)"
              >
                B
              </button>

              <button
                type="button"
                onClick={() => formatText('italic')}
                className={`px-4 py-2 rounded-md italic transition-all select-none ${
                  activeFormats.italic
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 hover:text-white'
                }`}
                title="İtalik (Ctrl+I)"
              >
                I
              </button>

              <button
                type="button"
                onClick={() => formatText('underline')}
                className={`px-4 py-2 rounded-md underline transition-all select-none ${
                  activeFormats.underline
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 hover:text-white'
                }`}
                title="Altı Çizili (Ctrl+U)"
              >
                U
              </button>
            </div>

            {/* 🎨 WYSIWYG EDITOR - ✅ ENTER sadece <br> ekler, PASTE düzeltildi */}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onMouseUp={updateFormatState}
              onKeyUp={updateFormatState}
              className={`w-full min-h-[400px] p-8 bg-gray-50 dark:bg-white/5 border rounded-[2.5rem] outline-none focus:ring-2 ring-red-600/20 dark:text-white font-serif text-lg leading-relaxed overflow-auto ${
                detectedBannedInContent.length > 0 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'dark:border-white/5'
              }`}
              data-placeholder="Hikayenizi buraya yazın..."
              suppressContentEditableWarning
            />

            {detectedBannedInContent.length > 0 && formData.content && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">
                  ÖNİZLEME (Yasaklı kelimeler vurgulandı):
                </p>
                <div 
                  className="text-sm leading-relaxed whitespace-pre-wrap font-serif"
                  dangerouslySetInnerHTML={{ __html: highlightContent(formData.content) }}
                />
              </div>
            )}
            
            <div className="flex justify-between items-center mt-2 px-4">
              {hasBannedWords && (
                <span className="text-xs font-bold text-red-500">
                  🚫 Bu içerik güncellenemez
                </span>
              )}
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 select-none ml-auto">
                {wordCount} Kelime
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="flex-1 h-14 rounded-full bg-gray-100 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
            >
              İptal
            </button>
            <button 
              type="submit" 
              disabled={updating || hasBannedWords}
              className="flex-[2] h-14 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/10 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'GÜNCELLENİYOR...' : hasBannedWords ? '🚫 Güncellenemez' : 'DEĞİŞİKLİKLERİ KAYDET ✅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}