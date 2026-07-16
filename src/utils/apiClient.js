// src/utils/apiClient.js
import axios from "axios";
import { db as firebaseDb, storage as firebaseStorage } from "../firebase/firebase";

// HTTP 클라이언트 설정 (baseURL 은 .env 에 정의된 API 엔드포인트로 교체)
const http = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const db = firebaseDb;
export const storage = firebaseStorage;
export { http };
