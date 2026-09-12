import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebase";

export async function checkNicknameAvailability(nickname) {
  const fn = httpsCallable(functions, "checkNicknameAvailability");
  const response = await fn({ nickname: String(nickname || "").trim() });
  return response?.data?.available === true;
}

export async function claimNickname(nickname) {
  const fn = httpsCallable(functions, "claimNickname");
  const response = await fn({ nickname: String(nickname || "").trim() });
  return response?.data ?? null;
}
