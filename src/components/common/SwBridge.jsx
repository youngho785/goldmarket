//src/components/common/SwBridge.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
