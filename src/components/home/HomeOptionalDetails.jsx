import React, { useState } from "react";
import styled from "styled-components";

const Disclosure = styled.details`
  > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 48px;
    padding: 12px 15px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 14px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
    font-size: .88rem;
    font-weight: 900;
    cursor: pointer;
    list-style: none;
  }
  > summary::-webkit-details-marker { display: none; }
  > summary::after { content: "⌄"; font-size: 1.25rem; line-height: 1; }
  &[open] > summary::after { transform: rotate(180deg); }
  > summary:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.gold};
    outline-offset: 2px;
  }
  > *:not(summary) { margin-top: 10px; }
`;

export default function HomeOptionalDetails({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <Disclosure onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>골드바 목표와 교환 가능량 자세히 보기</summary>
      {open && children}
    </Disclosure>
  );
}
