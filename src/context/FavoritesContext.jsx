//src/context/FavoritesContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  fetchFavorites,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
} from "../services/favoritesService";
import { useAuthContext } from "./AuthContext";

const defaultValue = {
  favorites: [],
  refreshFavorites: () => {},
  addToFavorites: () => {},
  removeFromFavorites: () => {},
};

const FavoritesContext = createContext(defaultValue);

export const FavoritesProvider = ({ children }) => {
  const { user } = useAuthContext();
  const [favorites, setFavorites] = useState([]);

  const refreshFavorites = useCallback(async () => {
    if (!user?.uid) {
      setFavorites([]);
      return;
    }
    try {
      const favs = await fetchFavorites(user.uid);
      setFavorites(favs);
    } catch (error) {
      console.error("찜 목록 가져오기 실패:", error);
      setFavorites([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  // 객체/문자열/숫자 어떤 형태로 와도 productId 문자열로 정규화
  const normalizeId = (input) => {
    if (input == null) return "";
    if (typeof input === "string" || typeof input === "number") return String(input);
    const keys = ["id", "productId", "pid", "docId", "_id"];
    for (const k of keys) {
      if (input[k] != null && input[k] !== "") return String(input[k]);
    }
    return "";
  };

  const addToFavorites = async (productOrId) => {
    if (!user?.uid) return;
    const productId = normalizeId(productOrId);
    if (!productId) {
      console.error("addToFavorites: 유효하지 않은 productId", productOrId);
      return;
    }
    try {
      await apiAddFavorite(user.uid, productId);
      await refreshFavorites();
    } catch (error) {
      console.error("찜하기 실패:", error);
    }
  };

  const removeFromFavorites = async (productOrId) => {
    if (!user?.uid) return;
    const productId = normalizeId(productOrId);
    if (!productId) {
      console.error("removeFromFavorites: 유효하지 않은 productId", productOrId);
      return;
    }
    try {
      await apiRemoveFavorite(user.uid, productId);
      await refreshFavorites();
    } catch (error) {
      console.error("찜취소 실패:", error);
    }
  };

  const value = useMemo(
    () => ({
      favorites,
      refreshFavorites,
      addToFavorites,
      removeFromFavorites,
    }),
    [favorites, refreshFavorites]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => useContext(FavoritesContext) || defaultValue;
