import { httpsCallable } from "firebase/functions";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db, functions } from "@/firebase/firebase";

async function call(name, payload = {}) {
  const response = await httpsCallable(functions, name)(payload);
  return response?.data ?? null;
}

export const listAdminUsers = (options = {}) =>
  call("listAdminUsers", {
    pageToken: options.pageToken || "",
    pageSize: options.pageSize || 50,
  });

export async function listAdminUserProfilesFallback() {
  const snapshot = await getDocs(query(collection(db, "users"), limit(100)));
  return {
    users: snapshot.docs.map((entry) => {
      const profile = entry.data() || {};
      const createdAt = profile.createdAt?.toDate?.()?.toISOString?.() || null;
      const role = profile.superAdmin === true || profile.role === "superAdmin"
        ? "superAdmin"
        : profile.admin === true || profile.role === "admin"
          ? "admin"
          : profile.role === "user"
            ? "user"
            : "unknown";
      return {
        uid: entry.id,
        email: String(profile.email || ""),
        displayName: String(profile.displayName || profile.nickname || ""),
        phoneNumber: String(profile.phoneNumber || profile.phone || ""),
        emailVerified: null,
        disabled: null,
        role,
        createdAt,
        lastSignInAt: null,
        bonusGoldG: Number(profile.bonusGoldG || 0),
      };
    }),
    nextPageToken: null,
    source: "firestore",
  };
}

export const setAdminUserDisabled = (uid, disabled) =>
  call("setAdminUserDisabled", { uid, disabled });

export const setManagedUserRole = (uid, role) =>
  call("setUserRole", { uid, role });

export const saveGoldRates = ({ purity, exchange, expectedVersion, reason }) =>
  call("updateGoldRates", { purity, exchange, expectedVersion, reason });
