// src/components/GoldExchangeTracker.jsx
import React from "react";
import styled from "styled-components";

const TrackerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 30px 0;
`;

const StepWrapper = styled.div`
  flex: 1;
  position: relative;
  text-align: center;
`;

const Circle = styled.div`
  width: 32px;
  height: 32px;
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.border || "#ddd"};
  border-radius: 50%;
  margin: 0 auto;
  line-height: 32px;
  color: ${({ theme }) => theme.colors.onPrimary || "#fff"};
  font-weight: bold;
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.border || "#ddd"};
`;

const Label = styled.div`
  margin-top: 8px;
  font-size: 0.9rem;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.textSecondary};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
`;

const ProgressBar = styled.div`
  position: absolute;
  top: 16px;
  left: 50%;
  width: calc(100% - 32px);
  height: 4px;
  background-color: ${({ $filled, theme }) =>
    $filled ? theme.colors.primary : theme.colors.border || "#ddd"};
  z-index: -1;
  border-radius: 2px;
`;

// 교환 상태별 단계 매핑
const statusMap = {
  requested: 0,
  in_progress: 1,
  completed: 2,
  교환중: 1,
  처리완료: 2,
};

export default function GoldExchangeTracker({ status }) {
  const currentStep = statusMap[status] ?? 0;
  const steps = [
    { label: "요청 접수" },
    { label: "교환 진행 중" },
    { label: "처리 완료" },
  ];

  return (
    <TrackerContainer>
      {steps.map((step, index) => (
        <StepWrapper key={index}>
          {index > 0 && <ProgressBar $filled={index <= currentStep} />}
          <Circle $active={index <= currentStep}>{index + 1}</Circle>
          <Label $active={index <= currentStep}>{step.label}</Label>
        </StepWrapper>
      ))}
    </TrackerContainer>
  );
}
