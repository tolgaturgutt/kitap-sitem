'use client';

import { useState, useEffect } from 'react';

export default function MobileDebug() {
  const [screenInfo, setScreenInfo] = useState({
    width: 0,
    height: 0,
    isMobile: false,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateScreenInfo = () => {
      const width = window.innerWidth;
      setScreenInfo({
        width,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        orientation: width > window.innerHeight ? 'landscape' : 'portrait',
        userAgent: navigator.userAgent,
      });
    };

    updateScreenInfo();
    window.addEventListener('resize', updateScreenInfo);
    window.addEventListener('orientationchange', updateScreenInfo);
    
    return () => {
      window.removeEventListener('resize', updateScreenInfo);
      window.removeEventListener('orientationchange', updateScreenInfo);
    };
  }, []);

  // Production'da gösterme
  if (process.env.NODE_ENV === 'production' && !window.location.search.includes('debug=true')) {
    return null;
  }

  return (
    <>
      {/* Toggle butonu */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-[10000] w-14 h-14 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-full flex items-center justify-center shadow-2xl font-bold text-2xl transition-all active:scale-90"
        title="Mobil Debug Aracı (Sadece development)"
      >
        📱
      </button>

      {/* Debug paneli */}
      {isVisible && (
        <div className="fixed bottom-24 left-4 z-[10000] bg-black/95 backdrop-blur-xl text-white p-5 rounded-2xl shadow-2xl border border-white/10 max-w-sm w-[calc(100vw-2rem)] sm:w-auto animate-in zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              📱 Screen Debug
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 active:bg-red-700 transition-all text-lg active:scale-90"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-xs font-mono">
            {/* Width & Height */}
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Width:</span>
                <span className="font-bold text-green-400">{screenInfo.width}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Height:</span>
                <span className="font-bold text-green-400">{screenInfo.height}px</span>
              </div>
            </div>

            {/* Device Info */}
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">DPR:</span>
                <span className="font-bold">{screenInfo.devicePixelRatio}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Orientation:</span>
                <span className="font-bold capitalize">{screenInfo.orientation}</span>
              </div>
            </div>

            {/* Breakpoint */}
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-400">Breakpoint:</span>
                <span className={`font-black uppercase text-xs px-2 py-1 rounded ${
                  screenInfo.isMobile ? 'bg-red-600' :
                  screenInfo.isTablet ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}>
                  {screenInfo.isMobile ? '📱 Mobile' :
                   screenInfo.isTablet ? '📋 Tablet' :
                   '🖥️ Desktop'}
                </span>
              </div>
            </div>

            {/* Tailwind Breakpoints */}
            <div className="bg-white/5 p-3 rounded-lg text-[10px] text-gray-400 space-y-1">
              <div className="font-bold text-white mb-2">Tailwind Breakpoints:</div>
              <div className={screenInfo.width < 640 ? 'text-green-400 font-bold' : ''}>
                • XS (default): 0-639px
              </div>
              <div className={screenInfo.width >= 640 && screenInfo.width < 768 ? 'text-green-400 font-bold' : ''}>
                • SM: 640px+
              </div>
              <div className={screenInfo.width >= 768 && screenInfo.width < 1024 ? 'text-green-400 font-bold' : ''}>
                • MD: 768px+
              </div>
              <div className={screenInfo.width >= 1024 && screenInfo.width < 1280 ? 'text-green-400 font-bold' : ''}>
                • LG: 1024px+
              </div>
              <div className={screenInfo.width >= 1280 && screenInfo.width < 1536 ? 'text-green-400 font-bold' : ''}>
                • XL: 1280px+
              </div>
              <div className={screenInfo.width >= 1536 ? 'text-green-400 font-bold' : ''}>
                • 2XL: 1536px+
              </div>
            </div>

            {/* User Agent (Kısa versiyon) */}
            <div className="bg-white/5 p-3 rounded-lg">
              <div className="text-gray-400 mb-1">Device:</div>
              <div className="text-[9px] text-white/60 leading-tight line-clamp-2">
                {screenInfo.userAgent?.includes('iPhone') && '📱 iPhone'}
                {screenInfo.userAgent?.includes('iPad') && '📋 iPad'}
                {screenInfo.userAgent?.includes('Android') && '🤖 Android'}
                {!screenInfo.userAgent?.includes('iPhone') && 
                 !screenInfo.userAgent?.includes('iPad') && 
                 !screenInfo.userAgent?.includes('Android') && '🖥️ Desktop'}
              </div>
            </div>
          </div>

          {/* Hızlı Test Butonları */}
          <div className="mt-4 space-y-2">
            <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">
              Quick Tests:
            </div>
            
            <button
              onClick={() => {
                window.open(window.location.href + '?width=375', '_blank');
              }}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3 rounded-lg text-xs font-bold flex items-center justify-between px-4 transition-all active:scale-95"
            >
              <span>📱 iPhone SE</span>
              <span className="text-[10px] opacity-70">375px</span>
            </button>

            <button
              onClick={() => {
                window.open(window.location.href + '?width=390', '_blank');
              }}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3 rounded-lg text-xs font-bold flex items-center justify-between px-4 transition-all active:scale-95"
            >
              <span>📱 iPhone 12/13/14</span>
              <span className="text-[10px] opacity-70">390px</span>
            </button>

            <button
              onClick={() => {
                window.open(window.location.href + '?width=768', '_blank');
              }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white py-3 rounded-lg text-xs font-bold flex items-center justify-between px-4 transition-all active:scale-95"
            >
              <span>📋 iPad</span>
              <span className="text-[10px] opacity-70">768px</span>
            </button>

            <button
              onClick={() => {
                window.open(window.location.href + '?width=1024', '_blank');
              }}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3 rounded-lg text-xs font-bold flex items-center justify-between px-4 transition-all active:scale-95"
            >
              <span>🖥️ Desktop</span>
              <span className="text-[10px] opacity-70">1024px+</span>
            </button>
          </div>

          {/* Pro Tips */}
          <div className="mt-4 p-3 bg-purple-600/20 border border-purple-500/30 rounded-lg">
            <div className="text-[10px] text-purple-300 font-bold mb-2">💡 Pro Tips:</div>
            <div className="text-[9px] text-purple-200 space-y-1">
              <div>• Chrome DevTools: Ctrl+Shift+M</div>
              <div>• iPhone'da test: npm run dev --host</div>
              <div>• Production'da: ?debug=true ekle</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}