import { createClient } from '@supabase/supabase-js';
import { firebaseMessaging } from '@/lib/firebaseAdmin';

const ANDROID_NOTIFICATION_CHANNEL_ID = 'kitaplab_default_v2';

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

function cleanData(data = {}) {
  const cleaned = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    cleaned[key] = String(value);
  }

  return cleaned;
}

export async function sendPushToUserEmail({
  recipientEmail,
  title,
  body,
  data = {},
}) {
  if (!recipientEmail) {
    return {
      ok: false,
      reason: 'recipientEmail yok',
      successCount: 0,
      failureCount: 0,
    };
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: tokenRows, error: tokenError } = await supabaseAdmin
    .from('push_tokens')
    .select('token')
    .eq('user_email', recipientEmail);

  if (tokenError) {
    console.error('[sendPushToUserEmail] token query error:', tokenError);
    throw tokenError;
  }

  const tokens = [
    ...new Set(
      (tokenRows || [])
        .map((row) => row.token)
        .filter(Boolean)
    ),
  ];

  if (tokens.length === 0) {
    return {
      ok: true,
      reason: 'Kullanıcının kayıtlı push tokeni yok.',
      successCount: 0,
      failureCount: 0,
    };
  }

  const response = await firebaseMessaging.sendEachForMulticast({
    tokens,
    notification: {
      title: title || 'KitapLab',
      body: body || 'Yeni bildirimin var.',
    },
    data: cleanData({
      ...data,
      source: 'kitaplab',
    }),
    android: {
      priority: 'high',
      notification: {
        channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
        sound: 'default',
        icon: 'ic_stat_kitaplab_push_v3',
        color: '#D71920',
      },
    },
  });

  const invalidTokens = [];

  response.responses.forEach((item, index) => {
    if (item.success) return;

    const code = item.error?.code;

    console.error('[sendPushToUserEmail] token send error:', {
      token: tokens[index],
      code,
      message: item.error?.message,
    });

    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length > 0) {
    await supabaseAdmin
      .from('push_tokens')
      .delete()
      .in('token', invalidTokens);
  }

  return {
    ok: true,
    successCount: response.successCount,
    failureCount: response.failureCount,
    deletedInvalidTokens: invalidTokens.length,
  };
}
