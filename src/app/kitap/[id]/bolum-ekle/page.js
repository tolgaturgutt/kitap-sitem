'use client';

import { useState, use, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function BolumEkle({ params }) {
  const { id } = use(params);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [savingMode, setSavingMode] = useState(null);
  const [bannedWords, setBannedWords] = useState([]);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false
  });
  const editorRef = useRef(null);
  const router = useRouter();

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
  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;

  // 🔴 YASAKLI KELİMELERİ TESPİT ET
function findBannedWords(text) {
  if (!text || bannedWords.length === 0) return [];
  
  // Metni kelimelere ayır (noktalama işaretleri olmadan)
  const words = text.toLowerCase().match(/[a-zğüşıöçA-ZĞÜŞİÖÇ]+/g) || [];
  const found = [];
  
  bannedWords.forEach(banned => {
    // Tam eşleşme kontrolü
    if (words.includes(banned.toLowerCase())) {
      found.push(banned);
    }
  });
  
  return [...new Set(found)];
}

  const detectedBannedInTitle = findBannedWords(title);
  const detectedBannedInContent = findBannedWords(content);
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
      setContent(editorRef.current.innerText);
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

  // ✅ PASTE (YAPIŞTIRMA) - WORD FORMATINI TEMİZLE AMA STİLİ KORU
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
      html = html.replace(g, "")
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
      const regex = new RegExp(`\\b(${banned})\\b`, 'gi');
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
      const regex = new RegExp(`\\b${banned}\\b`, 'gi');
      censored = censored.replace(regex, '***');
    });
    return censored;
  }

  async function bolumKaydet(e, isDraft = false) {
    e.preventDefault();
    
    // ✅ innerHTML kullan - formatlar korunacak
    let htmlContent = editorRef.current?.innerHTML || '';
    
    // ✅ Sadece gereksiz style, font ve span taglarını temizle (Güvenlik Önlemi)
    htmlContent = htmlContent.replace(/\s*style="[^"]*"/g, '');
    htmlContent = htmlContent.replace(/<\/?font[^>]*>/g, '');
    htmlContent = htmlContent.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '');
    // ✅ <div> taglarını <br> ile değiştir
    htmlContent = htmlContent.replace(/<div>/g, '<br>').replace(/<\/div>/g, '');
    
    if (!title.trim() || !content.trim()) {
      toast.error('Bölüm başlığı ve içeriği boş bırakılamaz.');
      return;
    }

    if (hasBannedWords) {
      toast.error(`⚠️ Yasaklı kelimeler tespit edildi: ${allDetectedBanned.join(', ')}`);
      return;
    }

    setSavingMode(isDraft ? 'draft' : 'publish');

    try {
      const { data: book } = await supabase
        .from('books')
        .select('title, username')
        .eq('id', id)
        .single();

      const { count } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', id);

      const sirasi = (count || 0) + 1;

      const censoredTitle = censorContent(title);
      const censoredContent = censorContent(htmlContent);

      const { data: newChapter, error } = await supabase
        .from('chapters')
        .insert([{
          book_id: id,
          title: censoredTitle,
          content: censoredContent,
          order_no: sirasi,
          word_count: wordCount, // ✅ ARTIK KELİME SAYISI KAYDEDİLİYOR
          is_draft: isDraft
        }])
        .select()
        .single();

      if (error) throw error;

      // Taslaklar kimseye duyurulmaz. Takipçilere bildirim yalnızca bölüm
      // gerçekten yayına alındığında gönderilir.
      if (!isDraft) {
        const { data: followers } = await supabase
          .from('follows')
          .select('user_email')
          .eq('book_id', id);

        if (followers && followers.length > 0) {
          const notifications = followers.map(f => ({
            recipient_email: f.user_email,
            actor_username: book.username,
            type: 'new_chapter',
            book_title: book.title,
            book_id: parseInt(id),
            chapter_id: newChapter.id,
            is_read: false,
            created_at: new Date()
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }

      toast.success(isDraft ? 'Bölüm taslaklara kaydedildi! 🔒' : 'Bölüm başarıyla yayınlandı!');
      setTimeout(() => {
        router.push(`/kitap/${id}`);
        router.refresh();
      }, 1000);

    } catch (error) {
      console.error(error);
      toast.error('Bir hata oluştu.');
    } finally {
      setSavingMode(null);
    }
  }

  return (
    <div className="min-h-screen py-24 px-6 bg-[#fcfcfc] dark:bg-[#080808]">
      <Toaster position="top-right" />

      <div className="max-w-3xl mx-auto">
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-black dark:text-white tracking-tighter mb-4">Yeni Bölüm Ekle</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">
            Hikayeni Devam Ettir
          </p>
        </header>

        <form onSubmit={bolumKaydet} className="space-y-8 bg-white dark:bg-black/20 p-10 rounded-[3rem] border dark:border-white/5 shadow-xl shadow-black/5">
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full p-5 bg-gray-50 dark:bg-white/5 border rounded-full outline-none focus:ring-2 ring-red-600/20 dark:text-white font-bold ${
                detectedBannedInTitle.length > 0 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'dark:border-white/5'
              }`}
              placeholder="Örn: 1. Başlangıç"
            />
            
            {detectedBannedInTitle.length > 0 && title && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                  ÖNİZLEME (Yasaklı kelimeler vurgulandı):
                </p>
                <div 
                  className="text-sm font-bold"
                  dangerouslySetInnerHTML={{ __html: highlightContent(title) }}
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
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
              data-placeholder="Hikayenizi buraya yazın..."
              suppressContentEditableWarning
            />

            {detectedBannedInContent.length > 0 && content && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">
                  ÖNİZLEME (Yasaklı kelimeler vurgulandı):
                </p>
                <div 
                  className="text-sm leading-relaxed whitespace-pre-wrap font-serif"
                  dangerouslySetInnerHTML={{ __html: highlightContent(content) }}
                />
              </div>
            )}
            
            <div className="flex justify-between items-center mt-2 px-4">
              {hasBannedWords && (
                <span className="text-xs font-bold text-red-500">
                  🚫 Bu içerik yayınlanamaz
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
              type="button"
              onClick={(e) => bolumKaydet(e, true)}
              disabled={savingMode !== null || hasBannedWords}
              className="flex-[2] h-14 rounded-full bg-gray-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingMode === 'draft' ? 'KAYDEDİLİYOR...' : '🔒 TASLAK OLARAK KAYDET'}
            </button>
            <button
              type="submit"
              disabled={savingMode !== null || hasBannedWords}
              className="flex-[2] h-14 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/10 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingMode === 'publish' ? 'YAYINLANIYOR...' : hasBannedWords ? '🚫 Yayınlanamaz' : 'YAYINLA 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
