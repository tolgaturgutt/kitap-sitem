import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUserEmail } from '@/lib/sendPushNotification';

export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server env eksik.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase public env eksik.');
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function buildNotificationText(notification) {
  const actor = notification.actor_username || 'Bir kullanıcı';
  const bookTitle = notification.book_title ? `"${notification.book_title}"` : 'bir içerik';

  switch (notification.type) {
    case 'chapter_vote':
      return {
        title: 'Bölümün beğenildi',
        body: `${actor}, ${bookTitle} kitabındaki bölümünü beğendi.`,
      };

    case 'comment':
      return {
        title: 'Yeni yorum',
        body: `${actor}, ${bookTitle} için yorum yaptı.`,
      };

    case 'reply':
      return {
        title: 'Yorumuna yanıt geldi',
        body: `${actor}, yorumuna yanıt verdi.`,
      };

    case 'pano_vote':
      return {
        title: 'Pano gönderin beğenildi',
        body: `${actor}, pano gönderini beğendi.`,
      };

    case 'pano_comment':
      return {
        title: 'Pano gönderine yorum geldi',
        body: `${actor}, pano gönderine yorum yaptı.`,
      };

    case 'new_chapter':
      return {
        title: 'Yeni bölüm yayınlandı',
        body: `${actor}, ${bookTitle} kitabına yeni bölüm ekledi.`,
      };

    default:
      return {
        title: 'KitapLab',
        body: 'Yeni bildirimin var.',
      };
  }
}

function buildNotificationUrl(notification) {
  if (notification.book_id && notification.chapter_id) {
    return `/kitap/${notification.book_id}/bolum/${notification.chapter_id}`;
  }

  if (notification.book_id) {
    return `/kitap/${notification.book_id}`;
  }

  return '/notifications';
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const accessToken = authHeader.replace('Bearer ', '').trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authorization token yok.' },
        { status: 401 }
      );
    }

    const supabaseAuth = getSupabaseAuthClient();

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: userError?.message || 'Kullanıcı doğrulanamadı.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const notificationId = body?.notification_id;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notification_id yok.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (notificationError || !notification) {
      return NextResponse.json(
        { error: notificationError?.message || 'Bildirim bulunamadı.' },
        { status: 404 }
      );
    }

    const { title, body: pushBody } = buildNotificationText(notification);
    const url = buildNotificationUrl(notification);

    const result = await sendPushToUserEmail({
      recipientEmail: notification.recipient_email,
      title,
      body: pushBody,
      data: {
        notification_id: notification.id,
        type: notification.type,
        book_id: notification.book_id,
        chapter_id: notification.chapter_id,
        pano_id: notification.pano_id,
        paragraph_id: notification.paragraph_id,
        comment_id: notification.comment_id,
        url,
      },
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error('[push/send] critical error:', error);

    return NextResponse.json(
      { error: error?.message || 'Bilinmeyen hata.' },
      { status: 500 }
    );
  }
}