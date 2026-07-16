// src/components/common/FormGroup.js
import styled from "styled-components";

export const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing(2)};
  display: flex;
  flex-direction: column;
  label { margin-bottom: ${({ theme }) => theme.spacing(1)}; }
`;
