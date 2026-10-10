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
  const [ratesReady, setRatesReady] = useState(false);
  const [market, setMarket] = useState({});
  const [previousMarket, setPreviousMarket] = useState({});
  const [marketSourceDate, setMarketSourceDate] = useState("");
  const [marketLoading, setMarketLoading] = useState(true);
  const [publicPriceEnabled, setPublicPriceEnabled] = useState(false);
  const [publicPriceLoading, setPublicPriceLoading] = useState(true);

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

  useEffect(() => {
    setRatesReady(false);
    return subscribeGoldRates(
      db,
      (next, snapshot) => {
        if (!snapshot.exists() || snapshot.metadata.fromCache) {
          setRatesReady(false);
          return;
        }
        setRates(next);
        setRatesReady(true);
      },
      (message, error) => {
        setRatesReady(false);
        console.warn(message, error?.message || error);
      },
      { includeMetadataChanges: true }
    );
  }, []);

  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPrices", "current"),
        (snapshot) => {
          const data = snapshot.exists() ? snapshot.data() || {} : {};
          setMarket(data.market && typeof data.market === "object" ? data.market : {});
          setMarketSourceDate(typeof data.sourceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.sourceDate) ? data.sourceDate : "");
          setPreviousMarket(
            data.previousMarket && typeof data.previousMarket === "object" ? data.previousMarket : {}
          );
          setMarketLoading(false);
        },
        () => {
          setMarket({});
          setPreviousMarket({});
          setMarketSourceDate("");
          setMarketLoading(false);
        }
      ),
    []
  );

  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPricePublic", "config"),
        (snapshot) => {
          setPublicPriceEnabled(snapshot.exists() && snapshot.data()?.enabled === true);
          setPublicPriceLoading(false);
        },
        () => {
          setPublicPriceEnabled(false);
          setPublicPriceLoading(false);
        }
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
  const recordSummary = useMemo(() => summarizeGoldVaultItems(items), [items]);
  const dashboardItems = ratesReady ? enrichedItems : items;
  const dashboardSummary = ratesReady ? summary : recordSummary;

  return {
    items: dashboardItems,
    itemsLoading,
    recordsLoading: itemsLoading,
    derivedLoading: !ratesReady,
    rates,
    ratesReady,
    market,
    previousMarket,
    marketSourceDate,
    marketLoading,
    publicPriceEnabled,
    publicPriceLoading,
    pureGoldBuyPricePerDon,
    previousPureGoldBuyPricePerDon,
    pureGoldSellPricePerDon,
    // Backward-compatible aliases used by existing UI and bonus-gold calculations.
    customerSellPricePerDon: pureGoldBuyPricePerDon,
    previousCustomerSellPricePerDon: previousPureGoldBuyPricePerDon,
    summary: dashboardSummary,
  };
}
