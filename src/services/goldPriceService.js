// src/services/goldPriceService.js
export const fetchGoldPrice = async () => {
    try {
      const response = await fetch("https://www.goldapi.io/api/XAU/USD", {
        headers: {
          "x-access-token": "YOUR_API_KEY", // GoldAPI.io에서 발급받은 실제 API 키로 대체
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("API 요청 실패");
      }
      const data = await response.json();
      // 예시: data.price에 현재 금 가격이 들어있다고 가정 (예: 1780.25)
      return data.price;
    } catch (error) {
      console.error("금 시세 데이터 가져오기 오류:", error);
      throw error;
    }
  };
  