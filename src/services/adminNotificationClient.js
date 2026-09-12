// src/services/adminNotificationClient.js
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebase";

export async function previewAdminNotificationRecipients(payload) {
  const callable = httpsCallable(functions, "previewAdminNotificationRecipients");
  const result = await callable(payload);
  return result?.data ?? null;
}

export async function sendAdminNotification(payload) {
  const callable = httpsCallable(functions, "sendAdminNotification");
  const result = await callable(payload);
  return result?.data ?? null;
}

export async function listAdminNotificationSends(payload = {}) {
  const callable = httpsCallable(functions, "listAdminNotificationSends");
  const result = await callable(payload);
  return result?.data ?? null;
}
