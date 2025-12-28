/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // unoptimized: true, 👈 BU SATIR SİLİNDİ, SORUN BUYDU
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Supabase'den gelen her şeye izin ver
      },
    ],
  },
};

export default nextConfig;