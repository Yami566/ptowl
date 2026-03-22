import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.moosebay.patientowl',
  appName: 'Patient Owl',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1B5E20',
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#1B5E20',
    },
  },
};

export default config;
