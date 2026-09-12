import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";

export const BOOKING_TIME_SLOTS = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export function normalizeBookingAvailabilityEntry(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const blockedSlots = new Set(
    Array.isArray(source.blockedSlots)
      ? source.blockedSlots.map((slot) => String(slot || "").trim()).filter(Boolean)
      : []
  );
  return {
    closed: source.closed === true,
    blockedSlots,
    reason: String(source.reason || "").trim(),
  };
}

export function getBookingAvailabilityEntry(data, dateKey) {
  return normalizeBookingAvailabilityEntry(data?.dates?.[dateKey]);
}

export default function useBookingAvailability() {
  const [raw, setRaw] = useState({ dates: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, "appConfig", "bookingAvailability");
    return onSnapshot(
      ref,
      (snap) => {
        setRaw(snap.exists() ? snap.data() || { dates: {} } : { dates: {} });
        setLoading(false);
      },
      (error) => {
        console.error("[useBookingAvailability] subscribe failed:", error);
        setRaw({ dates: {} });
        setLoading(false);
      }
    );
  }, []);

  const dates = useMemo(() => {
    const value = raw?.dates;
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }, [raw]);

  return { dates, loading, updatedAt: raw?.updatedAt || null };
}
