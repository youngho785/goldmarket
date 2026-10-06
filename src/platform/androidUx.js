import { App as CapacitorApp } from "@capacitor/app";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import { isAndroid, isNative } from "@/platform/runtime";

export function addAndroidBackButtonListener(handler) {
  if (!isAndroid || !isNative || typeof handler !== "function") {
    return () => {};
  }

  let removed = false;
  let handle = null;

  void CapacitorApp.addListener("backButton", handler)
    .then((listenerHandle) => {
      if (removed) {
        void listenerHandle.remove();
        return;
      }
      handle = listenerHandle;
    })
    .catch(() => {});

  return () => {
    removed = true;
    if (handle) {
      void handle.remove();
      handle = null;
    }
  };
}

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
