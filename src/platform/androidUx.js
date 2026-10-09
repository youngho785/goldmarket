import { App as CapacitorApp } from "@capacitor/app";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import { isAndroid, isNative } from "@/platform/runtime";

export async function exitAndroidApp() {
  if (!isAndroid || !isNative) return false;

  try {
    await CapacitorApp.exitApp();
    return true;
  } catch {
    return false;
  }
}

export async function hapticTap() {
  if (!isAndroid || !isNative) return false;

  try {
    await Haptics.impact({ style: ImpactStyle.Light });
    return true;
  } catch {
    return false;
  }
}
