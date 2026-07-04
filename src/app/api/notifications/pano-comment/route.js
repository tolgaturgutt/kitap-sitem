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

    const { comment_id: commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ error: 'Pano yorumu kimliği eksik.' }, { status: 400 });
    }

    const { data: comment, error: commentError } = await admin
      .from('pano_comments')
      .select('id, pano_id, parent_id, user_id, user_email, username, created_at')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: commentError?.message || 'Pano yorumu bulunamadı.' },
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

    const actorUsername =
      profile?.username || comment.username || user.email.split('@')[0];
    let recipientEmail;
    let type;

    if (comment.parent_id) {
      const { data: parentComment, error: parentError } = await admin
        .from('pano_comments')
        .select('user_email')
        .eq('id', comment.parent_id)
        .single();

      if (parentError || !parentComment?.user_email) {
        return NextResponse.json(
          { error: parentError?.message || 'Yanıtlanan pano yorumu bulunamadı.' },
          { status: 404 }
        );
      }

      recipientEmail = parentComment.user_email;
      type = 'reply';
    } else {
      const { data: pano, error: panoError } = await admin
        .from('panolar')
        .select('user_email')
        .eq('id', comment.pano_id)
        .single();

      if (panoError || !pano?.user_email) {
        return NextResponse.json(
          { error: panoError?.message || 'Pano sahibi bulunamadı.' },
          { status: 404 }
        );
      }

      recipientEmail = pano.user_email;
      type = 'pano_comment';
    }

    if (recipientEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ ok: true, skipped: 'self_notification' });
    }

    const { data: existing } = await admin
      .from('notifications')
      .select('id')
      .eq('recipient_email', recipientEmail)
      .eq('actor_username', actorUsername)
      .eq('type', type)
      .eq('pano_id', comment.pano_id)
      .eq('created_at', comment.created_at)
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
        pano_id: comment.pano_id,
        is_read: false,
        created_at: comment.created_at,
      })
      .select('id')
      .single();

    if (notificationError) throw notificationError;

    return NextResponse.json({ ok: true, notification_id: notification.id });
  } catch (error) {
    console.error('[notifications/pano-comment] error:', error);
    return NextResponse.json(
      { error: error?.message || 'Pano bildirimi oluşturulamadı.' },
      { status: 500 }
    );
  }
}
