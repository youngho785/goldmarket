// src/components/GoldExchangeTracker.js
import React from 'react';
import styled from 'styled-components';

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
  background-color: ${props => (props.active ? '#007bff' : '#ddd')};
  border-radius: 50%;
  margin: 0 auto;
  line-height: 32px;
  color: #fff;
  font-weight: bold;
`;

const Label = styled.div`
  margin-top: 8px;
  font-size: 0.9rem;
  color: ${props => (props.active ? '#007bff' : '#777')};
`;

const ProgressBar = styled.div`
  position: absolute;
  top: 16px;
  left: 50%;
  width: calc(100% - 32px);
  height: 4px;
  background-color: ${props => (props.filled ? '#007bff' : '#ddd')};
  z-index: -1;
`;

export default function GoldExchangeTracker({ status }) {
  // 단계 매핑: "requested" → 0, "교환중" → 1, "completed" → 2
  let currentStep = 0;
  if (status === '교환중') currentStep = 1;
  else if (status === 'completed') currentStep = 2;

  const steps = [
    { label: '요청 접수' },
    { label: '교환 진행 중' },
    { label: '처리 완료' }
  ];

  return (
    <TrackerContainer>
      {steps.map((step, index) => (
        <StepWrapper key={index}>
          {index !== 0 && (
            <ProgressBar filled={index <= currentStep} />
          )}
          <Circle active={index <= currentStep}>
            {index + 1}
          </Circle>
          <Label active={index <= currentStep}>
            {step.label}
          </Label>
        </StepWrapper>
      ))}
    </TrackerContainer>
  );
}
