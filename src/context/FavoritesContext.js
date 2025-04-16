// src/context/FavoritesContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchFavorites } from "../services/favoritesService";
import { useAuthContext } from "./AuthContext";

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const { user } = useAuthContext();
  const [favorites, setFavorites] = useState([]);

  // 백엔드에서 favorites 목록을 다시 불러오는 함수
  const refreshFavorites = async () => {
    if (user) {
      try {
        const favs = await fetchFavorites(user.uid);
        setFavorites(favs);
      } catch (error) {
        console.error("찜 목록 가져오기 실패:", error);
      }
    } else {
      setFavorites([]);
    }
  };

  // user가 변경될 때 favorites를 새로 불러옵니다.
  useEffect(() => {
    refreshFavorites();
  }, [user]);

  // 로컬 favorites에 항목을 추가하는 함수
  const addFavoriteLocal = (product) => {
    setFavorites((prev) => [...prev, product]);
  };

  // 로컬 favorites에서 항목을 제거하는 함수
  const removeFavoriteLocal = (productId) => {
    setFavorites((prev) =>
      prev.filter(
        (fav) =>
          fav.favoriteProductId !== productId && fav.id !== productId
      )
    );
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        setFavorites,
        addFavoriteLocal,
        removeFavoriteLocal,
        refreshFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
