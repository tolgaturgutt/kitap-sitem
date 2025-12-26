import { supabase } from '@/lib/supabase';

/**
 * BÖLÜM BEĞENİ BİLDİRİMİ
 * @param {string} actorUsername - Beğenen kişinin kullanıcı adı
 * @param {string} actorEmail - Beğenen kişinin email'i
 * @param {number} bookId - Kitap ID
 * @param {number} chapterId - Bölüm ID
 */
export async function createChapterVoteNotification(actorUsername, actorEmail, bookId, chapterId) {
  try {
    // Kitap sahibini bul
    const { data: book } = await supabase
      .from('books')
      .select('user_email, title')
      .eq('id', bookId)
      .single();
    
    if (!book || book.user_email === actorEmail) return; // Kendi kitabına beğeni atmışsa bildirim gönderme

    await supabase.from('notifications').insert({
      recipient_email: book.user_email,
      actor_username: actorUsername,
      type: 'chapter_vote',
      book_title: book.title,
      book_id: bookId,
      chapter_id: chapterId,
      is_read: false
    });
  } catch (error) {
    console.error('Chapter vote notification error:', error);
  }
}

/**
 * YORUM BİLDİRİMİ (Kitap/Bölüm)
 * @param {string} actorUsername - Yorum yapan kişinin kullanıcı adı
 * @param {string} actorEmail - Yorum yapan kişinin email'i
 * @param {number} bookId - Kitap ID
 * @param {number} chapterId - Bölüm ID (opsiyonel)
 */
export async function createCommentNotification(actorUsername, actorEmail, bookId, chapterId = null) {
  try {
    // Kitap sahibini bul
    const { data: book } = await supabase
      .from('books')
      .select('user_email, title')
      .eq('id', bookId)
      .single();
    
    if (!book || book.user_email === actorEmail) return; // Kendi kitabına yorum yapmışsa bildirim gönderme

    await supabase.from('notifications').insert({
      recipient_email: book.user_email,
      actor_username: actorUsername,
      type: 'comment',
      book_title: book.title,
      book_id: bookId,
      chapter_id: chapterId,
      is_read: false
    });
  } catch (error) {
    console.error('Comment notification error:', error);
  }
}

/**
 * YORUMA YANIT BİLDİRİMİ
 * @param {string} actorUsername - Yanıt veren kişinin kullanıcı adı
 * @param {string} actorEmail - Yanıt veren kişinin email'i
 * @param {string} recipientEmail - Yanıt alan kişinin email'i
 * @param {number} bookId - Kitap ID
 * @param {number} chapterId - Bölüm ID (opsiyonel)
 * @param {string} panoId - Pano ID (opsiyonel)
 */
export async function createReplyNotification(actorUsername, actorEmail, recipientEmail, bookId = null, chapterId = null, panoId = null) {
  try {
    if (recipientEmail === actorEmail) return; // Kendine yanıt vermişse bildirim gönderme

    let bookTitle = null;
    if (bookId) {
      const { data: book } = await supabase
        .from('books')
        .select('title')
        .eq('id', bookId)
        .single();
      bookTitle = book?.title;
    }

    await supabase.from('notifications').insert({
      recipient_email: recipientEmail,
      actor_username: actorUsername,
      type: 'reply',
      book_title: bookTitle,
      book_id: bookId,
      chapter_id: chapterId,
      pano_id: panoId,
      is_read: false
    });
  } catch (error) {
    console.error('Reply notification error:', error);
  }
}

/**
 * PANO BEĞENİ BİLDİRİMİ
 * @param {string} actorUsername - Beğenen kişinin kullanıcı adı
 * @param {string} actorEmail - Beğenen kişinin email'i
 * @param {string} panoId - Pano ID
 * @param {string} recipientEmail - Pano sahibinin email'i
 */
export async function createPanoVoteNotification(actorUsername, actorEmail, panoId, recipientEmail) {
  try {
    if (recipientEmail === actorEmail) return; // Kendi panosunu beğenmişse bildirim gönderme

    await supabase.from('notifications').insert({
      recipient_email: recipientEmail,
      actor_username: actorUsername,
      type: 'pano_vote',
      pano_id: panoId,
      is_read: false
    });
  } catch (error) {
    console.error('Pano vote notification error:', error);
  }
}

/**
 * PANO YORUM BİLDİRİMİ
 * @param {string} actorUsername - Yorum yapan kişinin kullanıcı adı
 * @param {string} actorEmail - Yorum yapan kişinin email'i
 * @param {string} panoId - Pano ID
 * @param {string} recipientEmail - Pano sahibinin email'i
 */
export async function createPanoCommentNotification(actorUsername, actorEmail, panoId, recipientEmail) {
  try {
    if (recipientEmail === actorEmail) return; // Kendi panosuna yorum yapmışsa bildirim gönderme

    await supabase.from('notifications').insert({
      recipient_email: recipientEmail,
      actor_username: actorUsername,
      type: 'pano_comment',
      pano_id: panoId,
      is_read: false
    });
  } catch (error) {
    console.error('Pano comment notification error:', error);
  }
}

/**
 * YENİ BÖLÜM BİLDİRİMİ (Kütüphanedeki takipçilere)
 * @param {string} actorUsername - Yazarın kullanıcı adı
 * @param {number} bookId - Kitap ID
 * @param {number} chapterId - Yeni bölüm ID
 * @param {string} bookTitle - Kitap başlığı
 */
export async function createNewChapterNotifications(actorUsername, bookId, chapterId, bookTitle) {
  try {
    // Bu kitabı kütüphanesine ekleyen kullanıcıları bul
    const { data: libraryUsers } = await supabase
      .from('reading_history')
      .select('user_email')
      .eq('book_id', bookId);
    
    if (!libraryUsers || libraryUsers.length === 0) return;

    // Tüm kullanıcılara bildirim gönder
    const notifications = libraryUsers.map(user => ({
      recipient_email: user.user_email,
      actor_username: actorUsername,
      type: 'new_chapter',
      book_title: bookTitle,
      book_id: bookId,
      chapter_id: chapterId,
      is_read: false
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (error) {
    console.error('New chapter notification error:', error);
  }
}