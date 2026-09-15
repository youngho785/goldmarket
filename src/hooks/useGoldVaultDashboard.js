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
  computeVaultMarketValueWon,
  computeVaultPureGoldG,
  computeVaultReplacementValueWon,
} from "@/lib/goldVaultCatalog";
import { subscribeGoldVaultItems } from "@/services/goldVaultService";

function summarizeItems(items = []) {
  return items.reduce(
    (acc, item) => ({
      itemCount: acc.itemCount + 1,
      totalWeightG: acc.totalWeightG + (Number(item.weightG) || 0),
      pureGoldG: acc.pureGoldG + (Number(item.pureGoldG) || 0),
      estimatedValueWon: acc.estimatedValueWon + (Number(item.estimatedValueWon) || 0),
      previousEstimatedValueWon:
        acc.previousEstimatedValueWon + (Number(item.previousEstimatedValueWon) || 0),
      replacementValueWon:
        acc.replacementValueWon + (Number(item.replacementValueWon) || 0),
    }),
    {
      itemCount: 0,
      totalWeightG: 0,
      pureGoldG: 0,
      estimatedValueWon: 0,
      previousEstimatedValueWon: 0,
      replacementValueWon: 0,
    }
  );
}

function withChange(summary) {
  const current = Number(summary.estimatedValueWon) || 0;
  const previous = Number(summary.previousEstimatedValueWon) || 0;
  const changeWon = current > 0 && previous > 0 ? current - previous : 0;
  const changePercent = previous > 0 ? (changeWon / previous) * 100 : null;

  return {
    ...summary,
    changeWon,
    changePercent,
    changeDirection:
      changeWon > 0 ? "up" : changeWon < 0 ? "down" : previous > 0 ? "same" : "unknown",
  };
}

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
      items.map((item) => {
        const pureGoldG = computeVaultPureGoldG(item, rates, pureGoldBuyPricePerDon);
        const previousPureGoldG = computeVaultPureGoldG(
          item,
          rates,
          previousPureGoldBuyPricePerDon
        );
        const estimatedValueWon = publicPriceEnabled
          ? computeVaultMarketValueWon(item, rates, market)
          : 0;
        const previousEstimatedValueWon = publicPriceEnabled
          ? computeVaultMarketValueWon(item, rates, previousMarket)
          : 0;
        const replacementValueWon = publicPriceEnabled
          ? computeVaultReplacementValueWon(pureGoldG, pureGoldSellPricePerDon)
          : 0;

        return {
          ...item,
          pureGoldG,
          previousPureGoldG,
          estimatedValueWon,
          previousEstimatedValueWon,
          replacementValueWon,
        };
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

  const summary = useMemo(() => withChange(summarizeItems(enrichedItems)), [enrichedItems]);

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
