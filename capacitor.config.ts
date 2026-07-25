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
    AdMob: {
      appId: 'ca-app-pub-9356201064551661~8341430531'
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_kitaplab_push_v3',
      iconColor: '#D71920'
    }
  }
};

export default config;
