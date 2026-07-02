'use client';

import PullToRefresh from 'react-simple-pull-to-refresh';
import { useRouter } from 'next/navigation';

export default function RefreshWrapper({ children }) {
  const router = useRouter();

  const handleRefresh = async () => {
    // Sayfayı komple yenilemek için:
    window.location.reload();
  };

  return (
    <PullToRefresh 
      onRefresh={handleRefresh}
      pullingContent={<div className="text-center p-4 text-xs font-bold text-gray-400">Yenilemek için bırak 👇</div>}
      refreshingContent={<div className="text-center p-4 text-xs font-bold text-red-500 animate-pulse">KitapLab Yenileniyor... 📚</div>}
    >
      {/* Tüm sayfaların içeriği bu children'ın içine gelecek */}
      <div className="min-h-screen">
        {children}
      </div>
    </PullToRefresh>
  );
}