import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/firebase/firebase";

const DELIVERY_TIMEOUT_MS = 5000;

export function createFirebaseMonitoringTransport() {
  const reportClientError = httpsCallable(functions, "reportClientError", {
    timeout: DELIVERY_TIMEOUT_MS,
  });

  return {
    name: "firebase-cloud-logging",
    async send(event) {
      const response = await reportClientError({
        ...event,
        authenticated: Boolean(auth.currentUser),
      });
      return response?.data?.ok === true;
    },
  };
}
