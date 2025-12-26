'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import PanoModal from '@/components/PanoModal';
export const dynamic = 'force-dynamic';

export default function PanoPage({ params }) {
  // ✅ params'ı unwrap et
  const resolvedParams = use(params);
  const panoId = resolvedParams.id;
  
  const [pano, setPano] = useState(null);
  const [user, setUser] = useState(null);
  const [adminEmails, setAdminEmails] = useState([]);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [panoId]);

  async function loadData() {
    // Kullanıcı bilgisi
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setUser(session.user);

    // Admin listesi
    const { data: admins } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin');
    setAdminEmails(admins?.map(a => a.email) || []);

    // Pano bilgisi
    const { data: panoData } = await supabase
      .from('panolar')
      .select(`
        *,
        books (
          id,
          title,
          cover_url
        ),
        profiles:user_id (
          username,
          avatar_url,
          email
        )
      `)
      .eq('id', panoId)
      .single();

    if (panoData) {
      setPano(panoData);
    } else {
      router.push('/');
    }
  }

  function handleClose() {
    router.back();
  }

  if (!pano) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/95">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const isAdmin = user && adminEmails.includes(user.email);
  const isOwner = user && (user.id === pano.user_id || user.email === pano.user_email);

  return (
    <PanoModal
      selectedPano={pano}
      onClose={handleClose}
      user={user}
      adminEmails={adminEmails}
      isAdmin={isAdmin}
      isOwner={isOwner}
      onDelete={() => router.push('/')}
    />
  );
}