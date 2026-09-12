//src/hooks/useReservedSlots.js
// 날짜별로 "이미 선점된 시간대"를 Set으로 반환하는 훅
// - 지원 스키마
//   1) { "YYYY-MM-DD": ["11:00", "12:00"] }
//   2) { "YYYY-MM-DD": { "11:00": true, "12:00": true } }
//   3) { "YYYY-MM-DD.11:00": true, "YYYY-MM-DD 12:00": true }  // flat 키
import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// 안전한 정규식 이스케이프
const esc = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

export default function useReservedSlots(dateKey) {
  const [raw, setRaw] = useState({});

  useEffect(() => {
    const ref = doc(db, "appConfig", "reservedSlots");
    const unsub = onSnapshot(
      ref,
      (snap) => setRaw(snap.exists() ? snap.data() || {} : {}),
      (err) => {
        console.error("[useReservedSlots] subscribe failed:", err);
        setRaw({});
      }
    );
    return () => unsub();
  }, []);

  const takenSet = useMemo(() => {
    const set = new Set();
    if (!dateKey) return set;

    const v = raw?.[dateKey];

    // 1) 날짜별 배열
    if (Array.isArray(v)) {
      v.forEach((t) => t && set.add(String(t)));
      return set;
    }

    // 2) 날짜별 맵
    if (v && typeof v === "object") {
      Object.keys(v).forEach((t) => v[t] && set.add(String(t)));
    }

    // 3) flat 키 지원: "YYYY-MM-DD.11:00" 또는 "YYYY-MM-DD 11:00"
    const re = new RegExp(`^${esc(dateKey)}[.\\s]([0-2]\\d:[0-5]\\d)$`);
    Object.keys(raw || {}).forEach((k) => {
      const m = re.exec(k);
      if (m && raw[k]) set.add(m[1]); // 캡쳐된 시간만 추가
    });

    return set;
  }, [raw, dateKey]);

  return takenSet; // Set<string>
}
