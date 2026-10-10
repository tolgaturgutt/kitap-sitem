import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function createSupabaseClient(key) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key) throw new Error('Supabase sunucu ayarları eksik.');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request) {
  try {
    const accessToken = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (!accessToken) return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });

    const authClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const admin = createSupabaseClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
    if (userError || !user?.id || !user?.email) return NextResponse.json({ error: 'Kullanıcı doğrulanamadı.' }, { status: 401 });

    const { comment_id: commentId } = await request.json();
    if (!commentId) return NextResponse.json({ error: 'Alıntı yorumu kimliği eksik.' }, { status: 400 });

    const { data: comment, error: commentError } = await admin
      .from('quote_comments')
      .select('id, quote_id, parent_id, user_id, created_at')
      .eq('id', commentId)
      .maybeSingle();
    if (commentError || !comment) return NextResponse.json({ error: 'Alıntı yorumu bulunamadı.' }, { status: 404 });
    if (String(comment.user_id) !== String(user.id)) return NextResponse.json({ error: 'Bu yorum sana ait değil.' }, { status: 403 });

    const { data: quote, error: quoteError } = await admin.from('book_quotes').select('id, user_id').eq('id', comment.quote_id).single();
    if (quoteError || !quote) return NextResponse.json({ error: 'Alıntı bulunamadı.' }, { status: 404 });
    const { data: actor } = await admin.from('profiles').select('username').eq('id', user.id).maybeSingle();
    let recipientEmail;
    let type;

    if (comment.parent_id) {
      const { data: parentComment, error: parentError } = await admin
        .from('quote_comments')
        .select('quote_id, user_id')
        .eq('id', comment.parent_id)
        .single();
      if (parentError || !parentComment || String(parentComment.quote_id) !== String(comment.quote_id)) {
        return NextResponse.json({ error: 'Yanıtlanan alıntı yorumu bulunamadı.' }, { status: 404 });
      }
      const { data: parentOwner } = await admin.from('profiles').select('email').eq('id', parentComment.user_id).maybeSingle();
      recipientEmail = parentOwner?.email;
      type = 'quote_reply';
    } else {
      const { data: owner } = await admin.from('profiles').select('email').eq('id', quote.user_id).maybeSingle();
      recipientEmail = owner?.email;
      type = 'quote_comment';
    }

    if (!recipientEmail) return NextResponse.json({ error: 'Bildirim alıcısı bulunamadı.' }, { status: 404 });
    if (recipientEmail.toLowerCase() === user.email.toLowerCase()) return NextResponse.json({ ok: true, skipped: 'self_notification' });

    const actorUsername = actor?.username || user.email.split('@')[0];
    const { data: existing } = await admin.from('notifications').select('id')
      .eq('recipient_email', recipientEmail).eq('actor_username', actorUsername)
      .eq('type', type).eq('quote_id', quote.id).eq('created_at', comment.created_at)
      .limit(1).maybeSingle();
    if (existing) return NextResponse.json({ ok: true, notification_id: existing.id });

    const { data: notification, error } = await admin.from('notifications').insert({
      recipient_email: recipientEmail,
      actor_username: actorUsername,
      type,
      quote_id: quote.id,
      is_read: false,
      created_at: comment.created_at,
    }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, notification_id: notification.id });
  } catch (error) {
    console.error('[notifications/quote-comment] error:', error);
    return NextResponse.json({ error: error?.message || 'Alıntı bildirimi oluşturulamadı.' }, { status: 500 });
  }
}
