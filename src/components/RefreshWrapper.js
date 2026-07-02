'use client';

import PullToRefresh from 'react-simple-pull-to-refresh';

export default function RefreshWrapper({ children }) {
  const handleRefresh = async () => {
    window.location.reload();
  };

  return (
    <PullToRefresh 
      onRefresh={handleRefresh}
      pullDownThreshold={50} // 🔥 KRİTİK AYAR 1: 80'den 50'ye çektik. Hafif çekmede bile algılayacak.
      maxPullDownDistance={80} // 🔥 KRİTİK AYAR 2: Ekranın sünmesini daralttık, lastik gibi uzamayacak.
      pullingContent={
        <div className="flex flex-col items-center justify-center py-4">
          {/* Kullanıcı ekranı çekmeye BAŞLADIĞI AN bu yazı çıkar */}
          <div className="text-[12px] font-black text-gray-400 uppercase tracking-wider transition-all">
            ↓ Kaydırarak Yenile
          </div>
        </div>
      }
      refreshingContent={
        <div className="flex flex-col items-center justify-center py-4">
          {/* Kullanıcı parmağını sınırın altındayken BIRAKTIĞI AN bu yazı çıkar */}
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