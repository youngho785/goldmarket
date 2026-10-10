export const KRX_TOTAL_BUDGET_MS = 45_000;
export const KRX_REQUEST_TIMEOUT_MS = 8_000;

// Keep enough time for Firestore writes before the 60-second function deadline.
export async function readKrxResponse(
  url: URL,
  deadline: number,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now
): Promise<unknown> {
  const remaining = deadline - now();
  if (remaining <= 0) throw new Error("KRX_BUDGET_EXHAUSTED");
  const response = await fetcher(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(Math.min(KRX_REQUEST_TIMEOUT_MS, remaining)),
  });
  // Read the body while the same abort signal is active.
  if (!response.ok) throw new Error("KRX_HTTP_" + response.status);
  const text = await response.text();
  try { return JSON.parse(text) as unknown; }
  catch { throw new Error("KRX_INVALID_JSON"); }
}
