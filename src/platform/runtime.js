import { Capacitor } from '@capacitor/core';

export const platform = Capacitor.getPlatform();

export const isNative = Capacitor.isNativePlatform();

export const isAndroid = platform === 'android';

export const isIOS = platform === 'ios';

export const isWeb = platform === 'web';
