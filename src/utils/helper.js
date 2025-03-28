export const formatPrice = (price) => {
    return price.toLocaleString("ko-KR", { style: "currency", currency: "KRW" });
  };
  