import { resetEmulators, seedCoreData } from "./helpers/smoke.mjs";

export default async function globalSetup() {
  await resetEmulators();
  await seedCoreData();
}
