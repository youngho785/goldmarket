import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

const [
  vaultDashboardSource,
  exchangeRemoteSource,
  appHomeSource,
  androidHomeSource,
  appMyGoldDashboardSource,
  myGoldVaultSource,
  myGoldItemsSource,
] = await Promise.all([
  read("src/hooks/useGoldVaultDashboard.js"),
  read("src/hooks/useGoldExchangeRemoteData.js"),
  read("src/pages/AppHome.jsx"),
  read("src/pages/AndroidHome.jsx"),
  read("src/components/gold/AppMyGoldDashboard.jsx"),
  read("src/pages/MyGoldVault.jsx"),
  read("src/components/myGoldVault/MyGoldItemsSection.jsx"),
]);

test("MY GOLD는 서버 goldRates 확인 전 기본 환산 결과를 공개하지 않는다", () => {
  assert.match(
    vaultDashboardSource,
    /const \[ratesReady, setRatesReady\] = useState\(false\)/
  );
  assert.match(
    vaultDashboardSource,
    /!snapshot\.exists\(\) \|\| snapshot\.metadata\.fromCache/
  );
  assert.match(vaultDashboardSource, /includeMetadataChanges: true/);
  assert.match(vaultDashboardSource, /setRatesReady\(true\)/);
});

test("환산 기준 확인 중에도 사용자가 기록한 MY GOLD 원본은 유지한다", () => {
  assert.match(
    vaultDashboardSource,
    /const recordSummary = useMemo\(\(\) => summarizeGoldVaultItems\(items\), \[items\]\)/
  );
  assert.match(
    vaultDashboardSource,
    /const dashboardItems = ratesReady \? enrichedItems : items/
  );
  assert.match(
    vaultDashboardSource,
    /const dashboardSummary = ratesReady \? summary : recordSummary/
  );
  assert.match(vaultDashboardSource, /itemsLoading,/);
  assert.match(vaultDashboardSource, /derivedLoading: !ratesReady/);

  assert.doesNotMatch(
    vaultDashboardSource,
    /dashboardItems = ratesReady \? enrichedItems : \[\]/
  );
});

test("MY GOLD와 GOLD TO GOLD는 같은 서버 환산율 readiness 원칙을 사용한다", () => {
  for (const source of [vaultDashboardSource, exchangeRemoteSource]) {
    assert.match(source, /snapshot\.metadata\.fromCache/);
    assert.match(source, /setRatesReady\(true\)/);
    assert.match(source, /includeMetadataChanges: true/);
  }
});

test("환산율 의존 UI는 readiness 완료 후에만 예상값과 교환 기능을 연다", () => {
  assert.match(
    appHomeSource,
    /\{hasMyGold && !myGoldDashboard\.itemsLoading && myGoldDashboard\.ratesReady && \(/
  );

  assert.match(
    androidHomeSource,
    /hasMyGold && dashboard\.ratesReady && \(/
  );

  assert.match(appMyGoldDashboardSource, /환산 기준 확인 중/);
  assert.match(appMyGoldDashboardSource, /const ratesReady = dashboard\.ratesReady !== false/);

  assert.match(
    myGoldVaultSource,
    /ratesReady \? guestSummary : summarizeGoldVaultItems\(guestRawItems\)/
  );
  assert.match(
    myGoldVaultSource,
    /\{hasVaultContent && ratesReady && exchangeProducts\.length > 0 && \(/
  );
  assert.match(myGoldVaultSource, /ratesReady=\{ratesReady\}/);

  assert.match(myGoldItemsSource, /예상 순금 환산 기준 확인 중/);
  assert.match(myGoldItemsSource, /disabled=\{!ratesReady\}/);
  assert.match(
    myGoldItemsSource,
    /예상 순금량 <strong>\{ratesReady \?/
  );
});