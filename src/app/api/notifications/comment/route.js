import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function createSupabaseClient(key) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url || !key) {
    throw new Error('Supabase sunucu ayarları eksik.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request) {
  try {
    const accessToken = (request.headers.get('authorization') || '')
      .replace('Bearer ', '')
      .trim();

    if (!accessToken) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const authClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const admin = createSupabaseClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user?.id || !user?.email) {
      return NextResponse.json(
        { error: userError?.message || 'Kullanıcı doğrulanamadı.' },
        { status: 401 }
      );
    }

    const { comment_id: commentId, target_comment_id: targetCommentId } =
      await request.json();

    if (!commentId) {
      return NextResponse.json({ error: 'Yorum kimliği eksik.' }, { status: 400 });
    }

    const { data: comment, error: commentError } = await admin
      .from('comments')
      .select('id, user_id, user_email, book_id, chapter_id, paragraph_id, parent_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: commentError?.message || 'Yorum bulunamadı.' },
        { status: 404 }
      );
    }

    if (
      String(comment.user_id) !== String(user.id) ||
      comment.user_email?.toLowerCase() !== user.email.toLowerCase()
    ) {
      return NextResponse.json({ error: 'Bu yorum sana ait değil.' }, { status: 403 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    const actorUsername = profile?.username || user.email.split('@')[0];
    let recipientEmail;
    let type;
    let bookTitle = null;

    if (targetCommentId) {
      const { data: targetComment, error: targetError } = await admin
        .from('comments')
        .select('user_email')
        .eq('id', targetCommentId)
        .single();

      if (targetError || !targetComment?.user_email) {
        return NextResponse.json(
          { error: targetError?.message || 'Yanıtlanan yorum bulunamadı.' },
          { status: 404 }
        );
      }

      recipientEmail = targetComment.user_email;
      type = 'reply';
    } else {
      const { data: book, error: bookError } = await admin
        .from('books')
        .select('user_email, title')
        .eq('id', comment.book_id)
        .single();

      if (bookError || !book?.user_email) {
        return NextResponse.json(
          { error: bookError?.message || 'Kitap bulunamadı.' },
          { status: 404 }
        );
      }

      recipientEmail = book.user_email;
      bookTitle = book.title;
      type = 'comment';
    }

    if (recipientEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ ok: true, skipped: 'self_notification' });
    }

    const { data: existing } = await admin
      .from('notifications')
      .select('id')
      .eq('comment_id', comment.id)
      .eq('recipient_email', recipientEmail)
      .eq('type', type)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, notification_id: existing.id });
    }

    const { data: notification, error: notificationError } = await admin
      .from('notifications')
      .insert({
        recipient_email: recipientEmail,
        actor_username: actorUsername,
        type,
        book_title: bookTitle,
        book_id: comment.book_id,
        chapter_id: comment.chapter_id,
        paragraph_id: comment.paragraph_id,
        comment_id: comment.id,
        is_read: false,
      })
      .select('id')
      .single();

    if (notificationError) {
      throw notificationError;
    }

    return NextResponse.json({ ok: true, notification_id: notification.id });
  } catch (error) {
    console.error('[notifications/comment] error:', error);
    return NextResponse.json(
      { error: error?.message || 'Bildirim oluşturulamadı.' },
      { status: 500 }
    );
  }
}
