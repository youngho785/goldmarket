import React, { useState, useEffect } from "react";
import { toggleFavorite, checkFavoriteStatus } from "../firebase/favoriteService";

function FavoriteButton({ userId, productId }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      const status = await checkFavoriteStatus(userId, productId);
      setIsFavorite(status);
    };
    fetchFavoriteStatus();
  }, [userId, productId]);

  const handleToggleFavorite = async () => {
    await toggleFavorite(userId, productId);
    setIsFavorite((prev) => !prev);
  };

  return (
    <button onClick={handleToggleFavorite} className={isFavorite ? "favorited" : "not-favorited"}>
      {isFavorite ? "❤️ 찜 해제" : "🤍 찜하기"}
    </button>
  );
}

export default FavoriteButton;