import { db } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// 사용자 프로필을 가져오는 함수
export const fetchUserProfile = async (uid) => {
  const userDocRef = doc(db, "users", uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return { uid: userDoc.id, ...userDoc.data() };
  } else {
    return null;
  }
};

// 사용자 프로필을 업데이트하는 함수 (문서가 없으면 새로 생성, 있으면 병합)
export const updateUserProfile = async (uid, profileData) => {
  const userDocRef = doc(db, "users", uid);
  return await setDoc(userDocRef, profileData, { merge: true });
};
