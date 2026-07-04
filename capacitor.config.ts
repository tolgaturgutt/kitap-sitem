import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tolga.kitaplab',
  appName: 'KitapLab',
  webDir: 'public',
  server: {
    url: 'https://www.kitaplab.com',
    allowNavigation: ['kitaplab.com', '*.kitaplab.com'],
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_kitaplab_notification',
      iconColor: '#D71920'
    }
  }
};

export default config;