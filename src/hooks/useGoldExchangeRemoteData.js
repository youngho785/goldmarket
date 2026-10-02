import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import {
  DEFAULT_PURITY,
  DEFAULT_EXCHANGE,
  DEFAULT_GOLD_PRODUCTS,
  subscribeGoldRates,
} from "@/lib/goldRates";
import { fetchMyProfile } from "@/services/userService";

export function useGoldExchangeMarketData() {
  const [rates, setRates] = useState({
    purity: DEFAULT_PURITY,
    exchange: DEFAULT_EXCHANGE,
    products: DEFAULT_GOLD_PRODUCTS,
  });
  const [pureGoldBuyPricePerDon, setPureGoldBuyPricePerDon] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeGoldRates(
      db,
      (merged) => setRates(merged),
      (message, error) => console.error(message, error)
    );
    return () => unsubscribe?.();
  }, []);

  useEffect(() => onSnapshot(
    doc(db, "goldPrices", "current"),
    (snapshot) => setPureGoldBuyPricePerDon(Number(snapshot.get("market.pureGoldBuyPerDon")) || 0),
    () => setPureGoldBuyPricePerDon(0)
  ), []);

  return { rates, pureGoldBuyPricePerDon };
}

export function useGoldExchangeStatus(exchangeId) {
  const [status, setStatus] = useState("requested");

  useEffect(() => {
    if (!exchangeId) {
      setStatus("requested");
      return undefined;
    }

    const refDoc = doc(db, "goldExchangeGroups", exchangeId);
    return onSnapshot(refDoc, (snapshot) => {
      const nextStatus = snapshot.data()?.repStatus;
      if (nextStatus) setStatus(nextStatus);
    });
  }, [exchangeId]);

  return status;
}

export function useGoldExchangeProfileDefaults(user, setName, setPhone) {
  useEffect(() => {
    if (!user?.uid) return undefined;

    let cancelled = false;

    setName((previous) => previous || user.displayName || "");
    setPhone((previous) => previous || user.phoneNumber || "");

    fetchMyProfile(user.uid)
      .then((profile) => {
        if (cancelled || !profile) return;
        setName((previous) => previous || profile.displayName || profile.name || "");
        setPhone((previous) => previous || profile.phone || "");
      })
      .catch((profileError) => {
        console.warn(
          "[GoldExchange] profile preload failed:",
          profileError?.message || profileError
        );
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.displayName, user?.phoneNumber, setName, setPhone]);
}
