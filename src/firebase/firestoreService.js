import { db, storage } from "./firebase";
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * ⏳ 시간 경과 계산 함수 (몇 분 전 / 몇 시간 전 / 몇 일 전)
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "알 수 없음";

  const now = new Date();
  const createdAt = timestamp.toDate();
  const diff = Math.floor((now - createdAt) / 1000); // 초 단위

  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

/**
 * 🔹 상품 등록 (Firestore + Storage)
 */
export const addProduct = async (product) => {
  try {
    let imageUrls = [];
    if (product.images && product.images.length > 0) {
      for (const image of product.images.slice(0, 3)) {
        const imageRef = ref(storage, `products/${image.name}`);
        await uploadBytes(imageRef, image);
        const imageUrl = await getDownloadURL(imageRef);
        imageUrls.push(imageUrl);
      }
    }

    const docRef = await addDoc(collection(db, "products"), {
      title: product.title,
      price: Number(product.price),
      description: product.description,
      imageUrls,
      location: product.location || "위치 정보 없음", // 📍 위치 정보 추가
      createdAt: new Date(),
      likes: [], // ❤️ 찜한 사용자 ID 저장
    });

    return docRef.id;
  } catch (error) {
    console.error("상품 등록 실패:", error);
    throw error;
  }
};

/**
 * 🔹 모든 상품 조회 (Firestore에서 가져오기)
 */
export const getProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? formatTimeAgo(doc.data().createdAt) : "알 수 없음",
    }));
  } catch (error) {
    console.error("상품 불러오기 실패:", error);
    throw error;
  }
};

/**
 * 🔹 찜하기 (좋아요) 기능
 */
export const likeProduct = async (productId, userId) => {
  try {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      likes: arrayUnion(userId),
    });
  } catch (error) {
    console.error("찜하기 실패:", error);
    throw error;
  }
};

/**
 * 🔹 알림 저장
 */
export const sendNotification = async (receiverId, message) => {
  try {
    await addDoc(collection(db, "notifications"), {
      receiverId,
      message,
      createdAt: new Date(),
      read: false,
    });
  } catch (error) {
    console.error("알림 저장 실패:", error);
    throw error;
  }
};
