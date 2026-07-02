'use client';

import PullToRefresh from 'react-simple-pull-to-refresh';

export default function RefreshWrapper({ children }) {
  const handleRefresh = async () => {
    // Sayfayı komple yenilemek için:
    window.location.reload();
  };

  return (
    <PullToRefresh 
      onRefresh={handleRefresh}
      pullDownThreshold={80} // 🔥 KRİTİK AYAR 1: En az 80 piksel aşağı çekmek ZORUNDA.
      maxPullDownDistance={110} // 🔥 KRİTİK AYAR 2: 110 pikselden fazla sündürüp ekranı bozmasın.
      pullingContent={
        <div className="flex flex-col items-center justify-center py-6">
          <div className="text-[12px] font-black text-gray-400 uppercase tracking-wider">
            Yenilemek için bırak 👇
          </div>
        </div>
      }
      refreshingContent={
        <div className="flex flex-col items-center justify-center py-6">
          <div className="text-[12px] font-black text-red-600 animate-pulse uppercase tracking-wider">
            KitapLab Yenileniyor... 📚
          </div>
        </div>
      }
    >
      <div className="min-h-screen">
        {children}
      </div>
    </PullToRefresh>
  );
}