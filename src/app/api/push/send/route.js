import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUserEmail } from '@/lib/sendPushNotification';

export const runtime = 'nodejs';

const WEBHOOK_SECRET_HEADER = 'x-kitaplab-webhook-secret';

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

function secretsMatch(providedSecret, expectedSecret) {
  if (!providedSecret || !expectedSecret) return false;

  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(expectedSecret);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function hasParagraphTarget(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== '' &&
    value !== 'null' &&
    value !== 'undefined'
  );
}

function buildNotificationText(notification) {
  const actor = notification.actor_username || 'Bir kullanıcı';
  const bookTitle = notification.book_title
    ? '“' + notification.book_title + '”'
    : 'bir içerik';

  switch (notification.type) {
    case 'vote':
      return {
        title: 'Eserin beğenildi',
        body: actor + ', ' + bookTitle + ' eserini beğendi.',
      };

    case 'chapter_vote':
      return {
        title: 'Bölümün beğenildi',
        body: actor + ', ' + bookTitle + ' kitabındaki bölümünü beğendi.',
      };

    case 'comment':
      return {
        title: 'Yeni yorum',
        body: actor + ', ' + bookTitle + ' için yorum yaptı.',
      };

    case 'reply':
      return {
        title: 'Yorumuna yanıt geldi',
        body: actor + ', yorumuna yanıt verdi.',
      };

    case 'pano_vote':
      return {
        title: 'Pano gönderin beğenildi',
        body: actor + ', pano gönderini beğendi.',
      };

    case 'pano_comment':
      return {
        title: 'Pano gönderine yorum geldi',
        body: actor + ', pano gönderine yorum yaptı.',
      };

    case 'new_chapter':
      return {
        title: 'Yeni bölüm yayınlandı',
        body: actor + ', ' + bookTitle + ' kitabına yeni bölüm ekledi.',
      };

    case 'library_add':
      return {
        title: 'Kitabın kütüphaneye eklendi',
        body: actor + ', ' + bookTitle + ' kitabını kütüphanesine ekledi.',
      };

    case 'follow':
      return {
        title: 'Yeni takipçin var',
        body: actor + ' seni takip etmeye başladı.',
      };

    default:
      return {
        title: 'KitapLab',
        body: 'Yeni bildirimin var.',
      };
  }
}

function buildNotificationUrl(notification) {
  if (notification.pano_id) {
    return '/pano/' + notification.pano_id;
  }

  if (notification.type === 'follow' && notification.actor_username) {
    return '/yazar/' + encodeURIComponent(notification.actor_username);
  }

  if (notification.book_id && notification.chapter_id) {
    const chapterUrl =
      '/kitap/' + notification.book_id + '/bolum/' + notification.chapter_id;

    if (notification.type === 'comment' || notification.type === 'reply') {
      const params = new URLSearchParams();

      if (hasParagraphTarget(notification.paragraph_id)) {
        params.set('openPara', notification.paragraph_id);
      } else {
        params.set('scrollTo', 'chapter-comments');
      }

      if (notification.comment_id) {
        params.set('commentId', notification.comment_id);
      }

      return chapterUrl + '?' + params.toString();
    }

    return chapterUrl;
  }

  if (notification.book_id) {
    return '/kitap/' + notification.book_id;
  }

  return '/';
}

async function markPushFailed(supabaseAdmin, notificationId, error) {
  const message = error?.message || String(error);

  const { error: updateError } = await supabaseAdmin
    .from('notifications')
    .update({
      push_status: 'failed',
      push_last_error: message.slice(0, 1000),
    })
    .eq('id', notificationId);

  if (updateError) {
    console.error('[push/send] failure status update error:', updateError);
  }
}

export async function POST(request) {
  let supabaseAdmin;
  let notificationId;

  try {
    const expectedSecret = process.env.PUSH_WEBHOOK_SECRET || '';
    const providedSecret = request.headers.get(WEBHOOK_SECRET_HEADER) || '';

    if (!expectedSecret) {
      console.error('[push/send] PUSH_WEBHOOK_SECRET tanımlı değil.');
      return NextResponse.json(
        { error: 'Push webhook sunucu ayarı eksik.' },
        { status: 500 }
      );
    }

    if (!secretsMatch(providedSecret, expectedSecret)) {
      return NextResponse.json(
        { error: 'Geçersiz webhook anahtarı.' },
        { status: 401 }
      );
    }

    const payload = await request.json();

    if (
      payload?.type !== 'INSERT' ||
      payload?.schema !== 'public' ||
      payload?.table !== 'notifications'
    ) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    notificationId = payload?.record?.id;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Bildirim kimliği bulunamadı.' },
        { status: 400 }
      );
    }

    supabaseAdmin = getSupabaseAdmin();

    const attemptedAt = new Date().toISOString();
    const { data: claimedRows, error: claimError } = await supabaseAdmin
      .from('notifications')
      .update({
        push_status: 'processing',
        push_attempted_at: attemptedAt,
        push_last_error: null,
      })
      .eq('id', notificationId)
      .in('push_status', ['pending', 'failed'])
      .select('*')
      .limit(1);

    if (claimError) {
      throw claimError;
    }

    const notification = claimedRows?.[0];

    if (!notification) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Bildirim daha önce işlendi veya şu anda işleniyor.',
      });
    }

    const { title, body } = buildNotificationText(notification);
    const url = buildNotificationUrl(notification);

    const result = await sendPushToUserEmail({
      recipientEmail: notification.recipient_email,
      title,
      body,
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

    const { error: sentStatusError } = await supabaseAdmin
      .from('notifications')
      .update({
        push_status: 'sent',
        push_sent_at: new Date().toISOString(),
        push_last_error: null,
      })
      .eq('id', notificationId);

    if (sentStatusError) {
      console.error('[push/send] sent status update error:', sentStatusError);
    }

    return NextResponse.json({
      ok: true,
      notification_id: notificationId,
      result,
    });
  } catch (error) {
    console.error('[push/send] critical error:', error);

    if (supabaseAdmin && notificationId) {
      await markPushFailed(supabaseAdmin, notificationId, error);
    }

    return NextResponse.json(
      { error: error?.message || 'Bilinmeyen hata.' },
      { status: 500 }
    );
  }
}
