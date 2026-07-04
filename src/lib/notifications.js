import { supabase } from '@/lib/supabase';

async function insertNotification(payload) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function insertNotifications(payloads) {
  if (!payloads || payloads.length === 0) return [];

  const { data, error } = await supabase
    .from('notifications')
    .insert(payloads)
    .select('id');

  if (error) {
    throw error;
  }

  return data || [];
}

async function postAuthenticatedNotification(url, payload) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return false;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) return true;

      const result = await response.json().catch(() => null);
      console.error('[notifications] API error:', result);

      if (attempt < 3) {
        await new Promise((resolve) => window.setTimeout(resolve, attempt * 400));
      }
    }

    return false;
  } catch (error) {
    console.error('[notifications] request error:', error);
    return false;
  }
}

async function createActivityNotification(type, payload) {
  return postAuthenticatedNotification('/api/notifications/activity', {
    type,
    ...payload,
  });
}

/**
 * BÖLÜM BEĞENİ BİLDİRİMİ
 */
export async function createChapterVoteNotification(chapterId) {
  return createActivityNotification('chapter_vote', {
    chapter_id: Number(chapterId),
  });
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

    await insertNotification({
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

    await insertNotification({
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
export async function createPanoVoteNotification(panoId) {
  return createActivityNotification('pano_vote', {
    pano_id: Number(panoId),
  });
}

/**
 * KÜTÜPHANEYE EKLEME BİLDİRİMİ
 */
export async function createLibraryAddNotification(bookId) {
  return createActivityNotification('library_add', {
    book_id: Number(bookId),
  });
}

/**
 * PANO YORUM BİLDİRİMİ
 */
export async function createPanoCommentNotification(commentId) {
  return postAuthenticatedNotification('/api/notifications/pano-comment', {
    comment_id: Number(commentId),
  });
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

    await insertNotifications(notifications);
  } catch (error) {
    console.error('New chapter notification error:', error);
  }
}
