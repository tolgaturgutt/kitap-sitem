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

    await insertNotification({
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
export async function createPanoVoteNotification(actorUsername, actorEmail, panoId, recipientEmail) {
  try {
    if (recipientEmail === actorEmail) return;

    await insertNotification({
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

    await insertNotification({
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

    await insertNotifications(notifications);
  } catch (error) {
    console.error('New chapter notification error:', error);
  }
}
