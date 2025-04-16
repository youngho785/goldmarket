// cypress/integration/goldExchange.spec.js
describe("Gold Exchange Flow", () => {
    it("사용자가 제품 정보를 입력하고 계산 후 최종 요청 제출하는 전체 플로우 테스트", () => {
      cy.visit("/gold-exchange");
  
      // 제품 정보 입력: 제품의 종류, 수량, 단위, 교환 유형 선택
      cy.get("select").eq(0).select("14k(585)");
      cy.get("input[type='number']").eq(0).type("100");
      cy.get("select").eq(1).select("g");
      cy.get("select").eq(2).select("999.9골드바");
  
      // 계산 버튼 클릭
      cy.contains("교환 결과 보기").click();
  
      // 결과 확인: 계산 결과 및 총 합계가 화면에 나타나는지
      cy.contains("총 합계").should("exist");
  
      // 추가 정보 입력 (파일 업로드는 생략 혹은 stub 처리)
      cy.get("input[type='text']").eq(0).type("테스트 사용자");
      cy.get("input[type='text']").eq(1).type("서울시 테스트구");
      cy.get("input[type='text']").eq(2).type("010-0000-0000");
      cy.get("input[type='email']").type("test@example.com");
  
      // 최종 제출 버튼 클릭
      cy.contains("최종 교환 요청 제출").click();
  
      // 완료 메시지 확인
      cy.contains("요청 접수 완료").should("exist");
    });
  });
  