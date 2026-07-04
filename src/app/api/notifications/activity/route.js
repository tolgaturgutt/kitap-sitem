import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set(['chapter_vote', 'pano_vote', 'library_add']);

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

async function getActorUsername(admin, user) {
  const { data: profile } = await admin
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  return profile?.username || user.email.split('@')[0];
}

async function getChapterVoteNotification(admin, user, chapterId) {
  if (!chapterId) throw new Error('Bölüm kimliği eksik.');

  const { data: vote } = await admin
    .from('chapter_votes')
    .select('chapter_id, created_at')
    .eq('chapter_id', chapterId)
    .eq('user_email', user.email)
    .limit(1)
    .maybeSingle();

  if (!vote) throw new Error('Beğeni kaydı bulunamadı.');

  const { data: chapter } = await admin
    .from('chapters')
    .select('id, book_id')
    .eq('id', chapterId)
    .single();

  if (!chapter) throw new Error('Bölüm bulunamadı.');

  const { data: book } = await admin
    .from('books')
    .select('user_email, title')
    .eq('id', chapter.book_id)
    .single();

  if (!book?.user_email) throw new Error('Kitap sahibi bulunamadı.');

  return {
    recipientEmail: book.user_email,
    eventCreatedAt: vote.created_at,
    notification: {
      type: 'chapter_vote',
      book_title: book.title,
      book_id: chapter.book_id,
      chapter_id: chapter.id,
    },
    duplicateFilters: {
      chapter_id: chapter.id,
    },
  };
}

async function getPanoVoteNotification(admin, user, voteId) {
  if (!voteId) throw new Error('Pano beğeni kimliği eksik.');

  const { data: vote } = await admin
    .from('pano_votes')
    .select('id, pano_id, created_at')
    .eq('id', voteId)
    .eq('user_email', user.email)
    .maybeSingle();

  if (!vote) throw new Error('Pano beğeni kaydı bulunamadı.');

  const { data: pano } = await admin
    .from('panolar')
    .select('id, user_email')
    .eq('id', vote.pano_id)
    .single();

  if (!pano?.user_email) throw new Error('Pano sahibi bulunamadı.');

  return {
    recipientEmail: pano.user_email,
    eventCreatedAt: vote.created_at,
    notification: {
      type: 'pano_vote',
      pano_id: pano.id,
    },
    duplicateFilters: {
      pano_id: pano.id,
    },
  };
}

async function getLibraryNotification(admin, user, bookId) {
  if (!bookId) throw new Error('Kitap kimliği eksik.');

  const { data: follow } = await admin
    .from('follows')
    .select('book_id, created_at')
    .eq('book_id', bookId)
    .eq('user_email', user.email)
    .limit(1)
    .maybeSingle();

  if (!follow) throw new Error('Kütüphane kaydı bulunamadı.');

  const { data: book } = await admin
    .from('books')
    .select('id, user_email, title')
    .eq('id', bookId)
    .single();

  if (!book?.user_email) throw new Error('Kitap sahibi bulunamadı.');

  return {
    recipientEmail: book.user_email,
    eventCreatedAt: follow.created_at,
    notification: {
      type: 'library_add',
      book_title: book.title,
      book_id: book.id,
    },
    duplicateFilters: {
      book_id: book.id,
    },
  };
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

    const body = await request.json();
    const type = body?.type;

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Bildirim türü geçersiz.' }, { status: 400 });
    }

    let activity;

    if (type === 'chapter_vote') {
      activity = await getChapterVoteNotification(admin, user, body.chapter_id);
    } else if (type === 'pano_vote') {
      activity = await getPanoVoteNotification(admin, user, body.vote_id);
    } else {
      activity = await getLibraryNotification(admin, user, body.book_id);
    }

    if (activity.recipientEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ ok: true, skipped: 'self_notification' });
    }

    const actorUsername = await getActorUsername(admin, user);
    let duplicateQuery = admin
      .from('notifications')
      .select('id')
      .eq('recipient_email', activity.recipientEmail)
      .eq('actor_username', actorUsername)
      .eq('type', type)
      .eq('created_at', activity.eventCreatedAt);

    for (const [column, value] of Object.entries(activity.duplicateFilters)) {
      duplicateQuery = duplicateQuery.eq(column, value);
    }

    const { data: existing } = await duplicateQuery.limit(1).maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, notification_id: existing.id });
    }

    const { data: notification, error: notificationError } = await admin
      .from('notifications')
      .insert({
        recipient_email: activity.recipientEmail,
        actor_username: actorUsername,
        ...activity.notification,
        is_read: false,
        created_at: activity.eventCreatedAt,
      })
      .select('id')
      .single();

    if (notificationError) throw notificationError;

    return NextResponse.json({ ok: true, notification_id: notification.id });
  } catch (error) {
    console.error('[notifications/activity] error:', error);
    return NextResponse.json(
      { error: error?.message || 'Bildirim oluşturulamadı.' },
      { status: 500 }
    );
  }
}
