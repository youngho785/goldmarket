import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, Save, X } from "lucide-react";

import { DON_TO_GRAMS } from "@/lib/goldRates";
import { getGoldVaultTypeLabel } from "@/lib/goldVaultCatalog";

const Card = styled.section`
  padding: 18px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 46%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 56%, ${({ theme }) => theme.colors.surface});
  box-shadow: ${({ theme }) => theme.shadows.xs};
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.03rem;
    line-height: 1.35;
  }

  small {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.55;
  }
`;

const Badge = styled.span`
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: 0.7rem;
  font-weight: 900;
`;

const List = styled.div`
  display: grid;
  gap: 7px;
  margin-top: 14px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.86rem;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Note = styled.p`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.82rem;
  line-height: 1.55;
`;

const Error = styled.p`
  margin: 10px 0 0;
  padding: 9px 10px;
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  color: ${({ theme }) => theme.semantic.alertErrorText};
  font-size: 0.84rem;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 14px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const PrimaryButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 14px;
  border: 0;
  border-radius: 11px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  font-weight: 900;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 800;
  cursor: pointer;
`;

const CalculatorLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.link};
  font-weight: 850;
  text-decoration: none;
`;

function formatWeight(weightG) {
  const grams = Number(weightG || 0);
  return `${grams.toFixed(2)}g · ${(grams / DON_TO_GRAMS).toFixed(2)}돈`;
}

export default function MyGoldImportPrompt({
  draft,
  currentCount = 0,
  maxItems = 30,
  loading = false,
  saving = false,
  error = "",
  onConfirm,
  onCancel,
}) {
  const items = Array.isArray(draft?.items) ? draft.items : [];

  if (!items.length) {
    return (
      <Card role="status">
        <Head>
          <div>
            <h2>저장할 계산 정보가 없습니다</h2>
            <small>임시 보관 시간이 지났거나 계산 정보가 지워졌습니다.</small>
          </div>
        </Head>
        <CalculatorLink to="/gold-exchange">
          금교환 계산기로 돌아가기 <ArrowRight size={15} aria-hidden />
        </CalculatorLink>
      </Card>
    );
  }

  const availableSlots = Math.max(0, maxItems - currentCount);
  const hasRoom = items.length <= availableSlots;
  const disabled = loading || saving || !hasRoom;

  return (
    <Card aria-labelledby="my-gold-import-title">
      <Head>
        <div>
          <h2 id="my-gold-import-title">계산한 금 {items.length}개를 내금고에 저장할까요?</h2>
          <small>금교환 계산기에서 입력한 금 종류와 원래 중량을 가져왔습니다.</small>
        </div>
        <Badge>계산기에서 가져옴</Badge>
      </Head>

      <List>
        {items.map((item, index) => (
          <Row key={`${item.goldType}-${index}`}>
            <strong>{item.label || getGoldVaultTypeLabel(item.goldType)}</strong>
            <span>{formatWeight(item.weightG)}</span>
          </Row>
        ))}
      </List>

      <Note>
        계산 당시의 예상 순금량이나 골드바 결과는 저장하지 않습니다. 내금고에는 원래 금 종류와 중량만 저장하고, 현재 시세와 교환 기준으로 가치를 다시 계산합니다. 이름과 메모는 저장 후 자유롭게 수정할 수 있습니다.
      </Note>

      {!loading && !hasRoom && (
        <Error>
          내금고는 최대 {maxItems}개까지 저장할 수 있습니다. 현재 {currentCount}개가 있어 {items.length}개를 모두 추가할 공간이 부족합니다. 아래 금고에서 일부 항목을 정리한 뒤 다시 저장해 주세요.
        </Error>
      )}
      {error && <Error role="alert">{error}</Error>}

      <Actions>
        <PrimaryButton type="button" onClick={onConfirm} disabled={disabled}>
          <Save size={16} aria-hidden />
          {saving ? "저장 중..." : `${items.length}개 모두 내금고에 저장`}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          <X size={15} aria-hidden /> 취소
        </SecondaryButton>
      </Actions>
    </Card>
  );
}
