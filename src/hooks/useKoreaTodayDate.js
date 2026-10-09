import { useEffect, useState } from "react";
import { getKoreaTodayDateKey } from "@/utils/koreaDisplayDate";

/** Updates the Korean calendar date when a long-lived tab crosses midnight. */
export default function useKoreaTodayDate() {
  const [todayKey, setTodayKey] = useState(getKoreaTodayDateKey);

  useEffect(() => {
    const refresh = () => setTodayKey(getKoreaTodayDateKey());
    const interval = window.setInterval(refresh, 60 * 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return todayKey;
}
