// src/hooks/useGoldVaultDashboard.js
import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/firebase/firebase";
import {
  DEFAULT_EXCHANGE,
  DEFAULT_PURITY,
  subscribeGoldRates,
} from "@/lib/goldRates";
import {
  enrichGoldVaultItems,
  summarizeGoldVaultItems,
} from "@/lib/goldVaultCatalog";
import { subscribeGoldVaultItems } from "@/services/goldVaultService";

export default function useGoldVaultDashboard(uid) {
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(!!uid);
  const [rates, setRates] = useState({ purity: DEFAULT_PURITY, exchange: DEFAULT_EXCHANGE, products: {} });
  const [market, setMarket] = useState({});
  const [previousMarket, setPreviousMarket] = useState({});
  const [publicPriceEnabled, setPublicPriceEnabled] = useState(false);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setItemsLoading(false);
      return undefined;
    }

    setItemsLoading(true);
    return subscribeGoldVaultItems(
      uid,
      (next) => {
        setItems(next);
        setItemsLoading(false);
      },
      (error) => {
        console.warn("[GoldVault] 보유 금 조회 실패:", error?.message || error);
        setItems([]);
        setItemsLoading(false);
      }
    );
  }, [uid]);

  useEffect(
    () =>
      subscribeGoldRates(
        db,
        (next) => setRates(next),
        (message, error) => console.warn(message, error?.message || error)
      ),
    []
  );

  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPrices", "current"),
        (snapshot) => {
          const data = snapshot.exists() ? snapshot.data() || {} : {};
          setMarket(data.market && typeof data.market === "object" ? data.market : {});
          setPreviousMarket(
            data.previousMarket && typeof data.previousMarket === "object" ? data.previousMarket : {}
          );
        },
        () => {
          setMarket({});
          setPreviousMarket({});
        }
      ),
    []
  );

  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPricePublic", "config"),
        (snapshot) => setPublicPriceEnabled(snapshot.exists() && snapshot.data()?.enabled === true),
        () => setPublicPriceEnabled(false)
      ),
    []
  );

  const pureGoldBuyPricePerDon = Number(market.pureGoldBuyPerDon) || 0;
  const previousPureGoldBuyPricePerDon = Number(previousMarket.pureGoldBuyPerDon) || 0;
  const pureGoldSellPricePerDon = Number(market.pureGoldSellPerDon) || 0;

  const enrichedItems = useMemo(
    () =>
      enrichGoldVaultItems(items, {
        rates,
        market,
        previousMarket,
        publicPriceEnabled,
        pureGoldBuyPricePerDon,
        previousPureGoldBuyPricePerDon,
        pureGoldSellPricePerDon,
      }),
    [
      items,
      market,
      previousMarket,
      rates,
      publicPriceEnabled,
      pureGoldBuyPricePerDon,
      previousPureGoldBuyPricePerDon,
      pureGoldSellPricePerDon,
    ]
  );

  const summary = useMemo(() => summarizeGoldVaultItems(enrichedItems), [enrichedItems]);

  return {
    items: enrichedItems,
    itemsLoading,
    rates,
    market,
    previousMarket,
    publicPriceEnabled,
    pureGoldBuyPricePerDon,
    previousPureGoldBuyPricePerDon,
    pureGoldSellPricePerDon,
    // Backward-compatible aliases used by existing UI and bonus-gold calculations.
    customerSellPricePerDon: pureGoldBuyPricePerDon,
    previousCustomerSellPricePerDon: previousPureGoldBuyPricePerDon,
    summary,
  };
}
