import assert from "node:assert/strict";
import fs from "node:fs";

const firebase = fs.readFileSync("src/firebase/firebase.js", "utf8");
const sw = fs.readFileSync("public/sw.js", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

assert.match(firebase, /function webPushBlockedForCurrentOrigin\(\)/);
assert.match(firebase, /if \(DEV\) return true;/);
assert.match(firebase, /isLoopbackHostname\(window\.location\?\.hostname\)/);
assert.match(firebase, /await cleanupBlockedWebPushRegistration\(targetUid\);/);
assert.match(firebase, /return null;\s*}\s*\n\s*if \(registeringByUid\.has\(targetUid\)\)/);
assert.match(firebase, /if \(!messaging \|\| webPushBlockedForCurrentOrigin\(\)\)/);
assert.match(firebase, /export async function showForegroundPushNotification\(payload\) \{\s*if \(webPushBlockedForCurrentOrigin\(\)\)/);

assert.match(sw, /function localPushOriginBlocked\(\)/);
assert.match(sw, /if \(localPushOriginBlocked\(\)\) return;/);

assert.equal(
  pkg.scripts?.["test:push-safety"],
  "node scripts/test-local-push-safety.mjs"
);

console.log("KGM local/localhost push safety PASS");