import { supabase } from '@/lib/supabase';

async function callPushSend(notificationId) {
  try {
    if (!notificationId) return;

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      console.warn('Push gönderilemedi: aktif session yok.', sessionError);
      return;
    }

    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        notification_id: notificationId,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Push send API hatası:', result);
      return;
    }

    console.log('Push send başarılı:', result);
  } catch (error) {
    console.error('Push send genel hata:', error);
  }
}

async function insertNotificationAndPush(payload) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  if (data?.id) {
    await callPushSend(data.id);
  }

  return data;
}

async function insertNotificationsAndPush(payloads) {
  if (!payloads || payloads.length === 0) return [];

  const { data, error } = await supabase
    .from('notifications')
    .insert(payloads)
    .select('id');

  if (error) {
    throw error;
  }

  const rows = data || [];

  await Promise.all(
    rows
      .filter((row) => row?.id)
      .map((row) => callPushSend(row.id))
  );

  return rows;
}

/**
 * BÖLÜM BEĞENİ BİLDİRİMİ
 */
export async function createChapterVoteNotification(actorUsername, actorEmail, bookId, chapterId) {
  try {
    const { data: book } = await supabase
      .from('books')
      .select('user_email, title')
      .eq('id', bookId)
      .single();

    if (!book || book.user_email === actorEmail) return;

    await insertNotificationAndPush({
      recipient_email: book.user_email,
      actor_username: actorUsername,
      type: 'chapter_vote',
      book_title: book.title,
      book_id: bookId,
      chapter_id: chapterId,
      is_read: false,
    });
  } catch (error) {
    console.error('Chapter vote notification error:', error);
  }
}

/**
 * YORUM BİLDİRİMİ
 */
export async function createCommentNotification(
  actorUsername,
  actorEmail,
  bookId,
  chapterId = null,
  paragraphId = null,
  commentId = null
) {
  try {
    const { data: book } = await supabase
      .from('books')
      .select('user_email, title')
      .eq('id', bookId)
      .single();

    if (!book || book.user_email === actorEmail) return;

    await insertNotificationAndPush({
      recipient_email: book.user_email,
      actor_username: actorUsername,
      type: 'comment',
      book_title: book.title,
      book_id: bookId,
      chapter_id: chapterId,
      paragraph_id: paragraphId,
      comment_id: commentId,
      is_read: false,
    });
  } catch (error) {
    console.error('Comment notification error:', error);
  }
}

/**
 * YORUMA YANIT BİLDİRİMİ
 */
export async function createReplyNotification(
  actorUsername,
  actorEmail,
  recipientEmail,
  bookId = null,
  chapterId = null,
  panoId = null,
  paragraphId = null,
  commentId = null
) {
  try {
    if (recipientEmail === actorEmail) return;

    let bookTitle = null;

    if (bookId) {
      const { data: book } = await supabase
        .from('books')
        .select('title')
        .eq('id', bookId)
        .single();

      bookTitle = book?.title || null;
    }

    await insertNotificationAndPush({
      recipient_email: recipientEmail,
      actor_username: actorUsername,
      type: 'reply',
      book_title: bookTitle,
      book_id: bookId,
      chapter_id: chapterId,
      pano_id: panoId,
      paragraph_id: paragraphId,
      comment_id: commentId,
      is_read: false,
    });
  } catch (error) {
    console.error('Reply notification error:', error);
  }
}

/**
 * PANO BEĞENİ BİLDİRİMİ
 */
export async function createPanoVoteNotification(actorUsername, actorEmail, panoId, recipientEmail) {
  try {
    if (recipientEmail === actorEmail) return;

    await insertNotificationAndPush({
      recipient_email: recipientEmail,
      actor_username: actorUsername,
      type: 'pano_vote',
      pano_id: panoId,
      is_read: false,
    });
  } catch (error) {
    console.error('Pano vote notification error:', error);
  }
}

/**
 * PANO YORUM BİLDİRİMİ
 */
export async function createPanoCommentNotification(actorUsername, actorEmail, panoId, recipientEmail) {
  try {
    if (recipientEmail === actorEmail) return;

    await insertNotificationAndPush({
      recipient_email: recipientEmail,
      actor_username: actorUsername,
      type: 'pano_comment',
      pano_id: panoId,
      is_read: false,
    });
  } catch (error) {
    console.error('Pano comment notification error:', error);
  }
}

/**
 * YENİ BÖLÜM BİLDİRİMİ
 */
export async function createNewChapterNotifications(actorUsername, bookId, chapterId, bookTitle) {
  try {
    const { data: libraryUsers } = await supabase
      .from('reading_history')
      .select('user_email')
      .eq('book_id', bookId);

    if (!libraryUsers || libraryUsers.length === 0) return;

    const uniqueEmails = [
      ...new Set(
        libraryUsers
          .map((user) => user.user_email)
          .filter(Boolean)
      ),
    ];

    const notifications = uniqueEmails.map((userEmail) => ({
      recipient_email: userEmail,
      actor_username: actorUsername,
      type: 'new_chapter',
      book_title: bookTitle,
      book_id: bookId,
      chapter_id: chapterId,
      is_read: false,
    }));

    await insertNotificationsAndPush(notifications);
  } catch (error) {
    console.error('New chapter notification error:', error);
  }
}