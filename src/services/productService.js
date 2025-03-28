import { db } from "../firebase/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export const addProduct = async (product) => {
  const colRef = collection(db, "products");
  return await addDoc(colRef, product);
};

export const fetchProducts = async () => {
  const colRef = collection(db, "products");
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
