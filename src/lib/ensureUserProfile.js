const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

function getProfileIdentity(user) {
  const username = String(user?.user_metadata?.username || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  const fullName =
    String(user?.user_metadata?.full_name || '').trim().slice(0, 255) ||
    username;

  if (!user?.id || !user?.email || !USERNAME_PATTERN.test(username)) {
    throw new Error('Hesap bilgileriyle profil oluşturulamadı.');
  }

  return { username, fullName };
}

export async function ensureUserProfile(supabase, user) {
  const { data: existingProfile, error: lookupError } = await supabase
    .from('profiles')
    .select('id, is_banned')
    .eq('id', user.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingProfile) return existingProfile;

  const { username, fullName } = getProfileIdentity(user);
  const { data: createdProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      username,
      full_name: fullName,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    })
    .select('id, is_banned')
    .single();

  if (insertError) throw insertError;
  return createdProfile;
}
