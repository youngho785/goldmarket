import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebase";

export async function saveBookingAvailability({ dateKey, closed = false, blockedSlots = [], reason = "" }) {
  const fn = httpsCallable(functions, "setBookingAvailability");
  const response = await fn({ dateKey, closed, blockedSlots, reason });
  return response?.data ?? null;
}
