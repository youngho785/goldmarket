//src/components/common/SwBridge.jsx
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/firebase/firebase";
import {
  flushPendingAdminCampaignClicks,
  queueAdminCampaignClick,
} from "@/services/adminCampaignTrackingClient";

const CAMPAIGN_PARAM = "_kgmc";
const NOTIFICATION_PARAM = "_kgmn";

function toInternalPath(value) {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export default function SwBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const batchId = String(params.get(CAMPAIGN_PARAM) || "").trim();
    const notificationId = String(params.get(NOTIFICATION_PARAM) || "").trim();

    if (!batchId && !notificationId) return;

    if (batchId && notificationId) {
      queueAdminCampaignClick({ batchId, notificationId });
      void flushPendingAdminCampaignClicks();
    }

    params.delete(CAMPAIGN_PARAM);
    params.delete(NOTIFICATION_PARAM);

    const query = params.toString();
    const cleanPath = `${location.pathname}${query ? `?${query}` : ""}${location.hash || ""}`;
    navigate(cleanPath, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) void flushPendingAdminCampaignClicks();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      const { type, data } = event.data || {};

      if (type === "OPEN_URL" && data?.url) {
        const path = toInternalPath(data.url);
        if (path) navigate(path);
        else window.location.assign(data.url);
        return;
      }

      if (type === "PUSH_MESSAGE") {
        window.dispatchEvent(
          new CustomEvent("APP_PUSH_MESSAGE", {
            detail: data || {},
          })
        );
        return;
      }

      if (type === "PUSH_SUBSCRIPTION_CHANGED") {
        window.dispatchEvent(
          new CustomEvent("PUSH_SUBSCRIPTION_CHANGED")
        );
      }
    };

    if (!("serviceWorker" in navigator)) return undefined;

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);

  return null;
}
