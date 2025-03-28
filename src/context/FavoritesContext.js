// src/context/FavoritesContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchFavorites } from "../services/favoritesService";
import { useAuthContext } from "./AuthContext";

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const { user } = useAuthContext();
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const fetchFavs = async () => {
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

    fetchFavs();
  }, [user]);

  return (
    <FavoritesContext.Provider value={{ favorites, setFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
