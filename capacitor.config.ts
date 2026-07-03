import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tolga.kitaplab',
  appName: 'KitapLab',
  webDir: 'public',
  server: {
    url: 'https://kitaplab.com',
    // 👇 İŞTE BU SATIRI EKLEMEN LAZIM KRAL
    allowNavigation: ['kitaplab.com', '*.kitaplab.com'],
    androidScheme: 'https',
    cleartext: true
  }
};

export default config;