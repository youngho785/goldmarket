// __tests__/computeFinalWeight.test.js
import { computeFinalWeight } from "../src/utils/computeFinalWeight"; // 경로를 실제 위치에 맞게 변경

describe("computeFinalWeight", () => {
  test("14k(585) 제품의 결과가 예상대로 계산되는지", () => {
    const prod = {
      goldType: "14k(585)",
      quantity: "100",  // 100g 입력
      inputUnit: "g",
      exchangeType: "999.9골드바"
    };
    // 100g * 0.54 * 0.95 = 51.3 (대략)
    expect(computeFinalWeight(prod)).toBeCloseTo(51.3, 1);
  });
});
