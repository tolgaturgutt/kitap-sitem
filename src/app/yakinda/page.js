'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function YakindaPage() {
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Particle mantığına dokunulmadı
    setParticles(
      [...Array(20)].map(() => ({
        width: Math.random() * 4 + 2,
        height: Math.random() * 4 + 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 5,
      }))
    );

    // Progress mantığına dokunulmadı (%99 sınırı duruyor)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) {
          clearInterval(interval);
          return 99;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden z-[9999]">
      {/* Background - Dokunulmadı */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white opacity-10"
              style={{
                width: `${particle.width}px`,
                height: `${particle.height}px`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animation: `float ${particle.duration}s infinite ease-in-out`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          
          {/* LOGO - YUVARLAK YAPILDI */}
          <div className="flex justify-center mb-12">
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 bg-red-600 rounded-full blur-2xl opacity-20 animate-pulse" />
              {/* Burası yuvarlağa ve transparanlığa çekildi */}
              <div className="relative w-full h-full rounded-full overflow-hidden bg-white shadow-2xl">
                <div 
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{ 
                    clipPath: `inset(0 ${100 - progress}% 0 0)`,
                  }}
                >
                  <Image
                    src="/logo.png"
                    alt="KitapLab Logo"
                    fill
                    priority
                    className="object-contain p-6" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Başlıklar - Dokunulmadı */}
          <div className="text-center mb-8">
            <h1 className="text-6xl md:text-7xl font-bold mb-4">
              <span className="text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.3)' }}>Kitap</span>
              <span className="text-red-600" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(220,38,38,0.5)' }}>Lab</span>
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 font-light tracking-wide">
              Yakında sizlerle...
            </p>
          </div>

          {/* Progress Bar - Dokunulmadı */}
          <div className="mb-8 px-4">
            <div className="relative w-full h-8 bg-gray-800 bg-opacity-50 rounded-full overflow-hidden backdrop-blur-sm border border-gray-700 shadow-2xl">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 opacity-20 blur-xl transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
              <div
                className="relative h-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center transition-all duration-500 ease-out shadow-lg"
                style={{ width: `${progress}%` }}
              >
                <span className="text-white text-sm font-bold tracking-wider drop-shadow-lg">
                  %{progress}
                </span>
              </div>
            </div>
          </div>

          {/* Açıklama - Dokunulmadı */}
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-400 font-light">
              📚 Kitap tutkunları için özel bir deneyim hazırlıyoruz
            </p>

            {/* MODERNLEŞTİRİLMİŞ INSTAGRAM BUTONU (Glassmorphism) */}
            <div className="pt-4">
                <a 
                  href="https://instagram.com/kitaplabtr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-4 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-bold tracking-wider hover:bg-white/20 transform hover:-translate-y-1 transition-all duration-300 group shadow-2xl"
                >
                  <div className="w-9 h-9 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <span>@kitaplabtr</span>
                </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
      `}</style>
    </div>
  );
}