import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  createFirebaseServiceWorkerUrl,
  FIREBASE_SW_CONFIG_KEYS,
} from "../src/firebase/serviceWorkerConfig.js";

const productionLike = {
  apiKey: "prod-api-key",
  authDomain: "prod.example.firebaseapp.com",
  projectId: "prod-project",
  storageBucket: "prod-project.appspot.com",
  messagingSenderId: "111111111111",
  appId: "1:111111111111:web:prod",
  measurementId: "G-PROD",
};

const stagingLike = {
  apiKey: "stage-api-key",
  authDomain: "stage.example.firebaseapp.com",
  projectId: "stage-project",
  storageBucket: "stage-project.appspot.com",
  messagingSenderId: "222222222222",
  appId: "1:222222222222:web:stage",
  measurementId: "G-STAGE",
};

test("운영/스테이징 Firebase 설정이 서로 다른 Service Worker URL을 만든다", () => {
  const prodUrl = createFirebaseServiceWorkerUrl(productionLike);
  const stageUrl = createFirebaseServiceWorkerUrl(stagingLike);

  assert.notEqual(prodUrl, stageUrl);

  const prodParams = new URL(prodUrl, "https://example.com").searchParams;
  const stageParams = new URL(stageUrl, "https://example.com").searchParams;

  assert.equal(prodParams.get("projectId"), "prod-project");
  assert.equal(stageParams.get("projectId"), "stage-project");

  for (const key of FIREBASE_SW_CONFIG_KEYS) {
    if (productionLike[key]) {
      assert.equal(prodParams.get(key), productionLike[key]);
    }
  }
});

test("필수 Firebase 설정이 없으면 Service Worker URL 생성을 거부한다", () => {
  assert.throws(
    () => createFirebaseServiceWorkerUrl({ projectId: "only-project" }),
    /apiKey.*messagingSenderId.*appId/
  );
});

test("Service Worker와 등록 코드에 운영 Firebase 하드코딩이 남지 않는다", async () => {
  const [swSource, mainSource, firebaseSource, envExample, workflowSource] =
    await Promise.all([
      readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
      readFile(new URL("../src/main.jsx", import.meta.url), "utf8"),
      readFile(new URL("../src/firebase/firebase.js", import.meta.url), "utf8"),
      readFile(new URL("../.env.example", import.meta.url), "utf8"),
      readFile(new URL("../.github/workflows/quality.yml", import.meta.url), "utf8"),
    ]);

  assert.doesNotMatch(swSource, /goldmarket-0/);
  assert.doesNotMatch(swSource, /AIzaSyAvjsOmLSZ9sTPOn38LYMbESEYV1qJ914M/);
  assert.match(swSource, /new URL\(self\.location\.href\)\.searchParams/);

  assert.match(mainSource, /createFirebaseServiceWorkerUrl\(firebaseConfig\)/);
  assert.match(firebaseSource, /createFirebaseServiceWorkerUrl\(firebaseConfig\)/);
  assert.doesNotMatch(firebaseSource, /getRegistration\("\/sw\.js"\)/);
  assert.doesNotMatch(firebaseSource, /register\("\/sw\.js"/);

  for (const envKey of [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_MEASUREMENT_ID",
    "VITE_FIREBASE_DATABASE_URL",
  ]) {
    assert.match(envExample, new RegExp(`^${envKey}=`, "m"));
  }

  assert.match(workflowSource, /npm run test:sw-config/);
});
