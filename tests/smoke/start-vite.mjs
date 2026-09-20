import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");

Object.assign(process.env, {
  VITE_USE_FIREBASE_EMULATORS: "true",
  VITE_FIREBASE_API_KEY: "demo-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "demo-goldmarket.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "demo-goldmarket",
  VITE_FIREBASE_STORAGE_BUCKET: "demo-goldmarket.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
  VITE_FIREBASE_APP_ID: "1:1234567890:web:small-smoke",
  VITE_FIREBASE_MEASUREMENT_ID: "",
  VITE_FIREBASE_APPCHECK_SITE_KEY: "",
  VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: "",
  VITE_PRODUCT_ANALYTICS_ENABLED: "false",
  VITE_PRODUCT_ANALYTICS_DEBUG: "false",
  VITE_VAPID_KEY: "",
  VITE_FIRESTORE_FORCE_LONG_POLLING: "false",
  VITE_REQUIRE_ADMIN_MFA: "false"
});

const server = await createServer({
  root: projectRoot,
  configFile: path.join(projectRoot, "vite.config.js"),
  server: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true
  },
  clearScreen: false
});

await server.listen();
server.printUrls();

let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  try { await server.close(); } finally { process.exit(0); }
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
await new Promise(() => {});
