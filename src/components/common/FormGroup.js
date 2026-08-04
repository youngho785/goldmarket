// src/components/common/FormGroup.js
import styled from "styled-components";

export const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing(2.25)};
  display: flex;
  flex-direction: column;
  label {
    margin-bottom: 7px;
    color: ${({ theme }) => theme.colors.text};
    font-size: .94rem;
    font-weight: 750;
  }
`;
