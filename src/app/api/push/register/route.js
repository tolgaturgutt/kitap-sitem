import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const body = await request.json();
    const token = body?.token;
    const platform = body?.platform || 'android';

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'FCM token yok.' },
        { status: 400 }
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

    const supabaseAdmin = getSupabaseAdmin();

    const tokenPayload = {
      user_email: user.email,
      token,
      platform,
      updated_at: new Date().toISOString(),
    };

    let { error: upsertError } = await supabaseAdmin
      .from('push_tokens')
      .upsert(tokenPayload, {
        onConflict: 'token',
      });

    // token sütununda UNIQUE kuralı yoksa standart upsert 42P10 döner.
    // Bu durumda mevcut kaydı güncelle veya ilk kaydı ekle.
    if (upsertError?.code === '42P10') {
      const { data: existingTokens, error: lookupError } = await supabaseAdmin
        .from('push_tokens')
        .select('token')
        .eq('token', token)
        .limit(1);

      if (lookupError) {
        upsertError = lookupError;
      } else if (existingTokens?.length) {
        const { error: updateError } = await supabaseAdmin
          .from('push_tokens')
          .update(tokenPayload)
          .eq('token', token);

        upsertError = updateError;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('push_tokens')
          .insert(tokenPayload);

        upsertError = insertError;
      }
    }

    if (upsertError) {
      console.error('[push/register] Supabase upsert error:', upsertError);

      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      user_email: user.email,
      platform,
    });
  } catch (error) {
    console.error('[push/register] critical error:', error);

    return NextResponse.json(
      { error: error?.message || 'Bilinmeyen hata.' },
      { status: 500 }
    );
  }
}