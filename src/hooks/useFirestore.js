import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function useFirestore(collectionName) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, [collectionName]);

  return data;
}
