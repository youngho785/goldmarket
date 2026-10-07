import { httpsCallable } from "firebase/functions";

import { functions } from "@/firebase/firebase";

const analyzeHallmark = httpsCallable(
  functions,
  "analyzeGoldHallmark",
  {
    timeout: 65000,
  }
);

export async function analyzeGoldHallmarkImage({
  imageBase64,
  mimeType,
}) {
  const response = await analyzeHallmark({
    imageBase64: String(imageBase64 || ""),
    mimeType: String(mimeType || ""),
  });

  return response?.data ?? null;
}