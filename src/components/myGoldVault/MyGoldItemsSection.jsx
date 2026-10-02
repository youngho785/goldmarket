import React, { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  AddGoldButton,
  Empty,
  ErrorText,
  ExchangeSelectionBar,
  GoldSeed,
  ItemActions,
  ItemCard,
  ItemList,
  ItemMain,
  ItemMetrics,
  ItemSelectToggle,
  SectionActions,
  SectionHead,
  VaultSection,
} from "@/components/myGoldVault/MyGoldVault.styles";
import { DON_TO_GRAMS } from "@/lib/goldRates";
import { getGoldVaultTypeLabel, summarizeGoldVaultItems } from "@/lib/goldVaultCatalog";

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "-";
}

function formatGramsAndDon(value) {
  const grams = Number(value);
  if (!Number.isFinite(grams) || grams <= 0) return "-";
  return `${grams.toFixed(2)}g · ${(grams / DON_TO_GRAMS).toFixed(2)}돈`;
}

function toVaultExchangeProduct(item) {
  return {
    productId: item?.productId || "",
    goldType: item?.goldType,
    quantity: Number(item?.weightG || 0),
    inputUnit: "g",
    exchangeType: "999.9골드바",
    sourceItemId: item?.id,
    sourceLabel: item?.label || "금제품",
  };
}

export default function MyGoldItemsSection({
  isGuest,
  sortedItems,
  activeSummary,
  rates,
  publicPriceEnabled,
  vaultLoading,
  error,
  formOpen,
  exchangeProducts,
  maxExchangeProducts,
  onError,
  onAdd,
  onEdit,
  onRemove,
  onResetGuest,
}) {
  const navigate = useNavigate();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const selectedItems = useMemo(() => {
    if (!selectionMode || selectedIds.length === 0) return [];
    const selected = new Set(selectedIds);
    return sortedItems.filter((item) => selected.has(item.id));
  }, [selectionMode, selectedIds, sortedItems]);

  const selectedSummary = useMemo(
    () => summarizeGoldVaultItems(selectedItems),
    [selectedItems]
  );

  const allSelectableItemsSelected =
    sortedItems.length > 0 &&
    sortedItems.length <= maxExchangeProducts &&
    selectedItems.length === sortedItems.length;

  const navigateWithProducts = (products) => {
    navigate("/gold-exchange?mode=vault&auto=1", {
      state: {
        source: "my-gold",
        vaultProducts: products,
      },
    });
  };

  const openSingleItemExchange = (item) => {
    if (!item) return;
    navigateWithProducts([toVaultExchangeProduct(item)]);
  };

  const openAllItemsExchange = () => {
    if (sortedItems.length === 0) return;
    if (sortedItems.length > maxExchangeProducts) {
      onError(
        `금교환은 한 번에 최대 ${maxExchangeProducts}개까지 진행할 수 있습니다. 기록을 ${maxExchangeProducts}개 이하로 정리하거나 필요한 금만 선택해 예상 확인해 주세요.`
      );
      return;
    }
    onError("");
    navigateWithProducts(exchangeProducts);
  };

  const startSelection = () => {
    onError("");
    setSelectedIds([]);
    setSelectionMode(true);
  };

  const cancelSelection = () => {
    onError("");
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const toggleSelection = (itemId) => {
    if (!itemId) return;
    onError("");
    setSelectedIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }
      if (current.length >= maxExchangeProducts) {
        onError(`금교환은 한 번에 최대 ${maxExchangeProducts}개까지 선택할 수 있습니다.`);
        return current;
      }
      return [...current, itemId];
    });
  };

  const selectAll = () => {
    const nextIds = sortedItems.slice(0, maxExchangeProducts).map((item) => item.id);
    setSelectedIds(nextIds);
    onError(
      sortedItems.length > maxExchangeProducts
        ? `금교환은 한 번에 최대 ${maxExchangeProducts}개까지 선택할 수 있어 앞의 ${maxExchangeProducts}개를 선택했습니다.`
        : ""
    );
  };

  const openSelectedItemsExchange = () => {
    if (selectedItems.length === 0) {
      onError("교환할 금을 한 개 이상 선택해 주세요.");
      return;
    }
    onError("");
    navigateWithProducts(selectedItems.map(toVaultExchangeProduct));
  };

  return (
    <VaultSection aria-labelledby="my-vault-items-title">
      <SectionHead>
        <div>
          <h2 id="my-vault-items-title">기록 목록</h2>
          <p>
            {isGuest
              ? "예시 금을 수정하거나 내 금을 새로 기록해 보세요. 변경한 내용이 MY GOLD 요약과 가치 변화에 바로 반영됩니다."
              : `현재 ${sortedItems.length}개 · 기록 중량 ${Number(activeSummary.totalWeightG || 0).toFixed(2)}g · 예상 순금 ${Number(activeSummary.pureGoldG || 0).toFixed(2)}g`}
          </p>
        </div>

        <SectionActions>
          {sortedItems.length > 0 && !selectionMode && (
            <>
              <AddGoldButton
                type="button"
                onClick={startSelection}
                aria-label="기록된 금 중 GOLD TO GOLD 예상 확인할 항목 선택"
              >
                선택해서 예상 확인
              </AddGoldButton>
              <AddGoldButton
                type="button"
                onClick={openAllItemsExchange}
                aria-label="기록된 금 전체로 GOLD TO GOLD 예상 확인"
              >
                전체 예상 확인 ({sortedItems.length})
              </AddGoldButton>
            </>
          )}

          {sortedItems.length > 0 && selectionMode && (
            <>
              <AddGoldButton
                type="button"
                onClick={selectAll}
                disabled={allSelectableItemsSelected}
              >
                {allSelectableItemsSelected ? "전체 선택됨" : "전체 선택"}
              </AddGoldButton>
              <AddGoldButton type="button" onClick={cancelSelection}>
                취소
              </AddGoldButton>
            </>
          )}

          {isGuest && !selectionMode && (
            <AddGoldButton type="button" onClick={onResetGuest}>예시 초기화</AddGoldButton>
          )}
        </SectionActions>
      </SectionHead>

      {selectionMode && sortedItems.length > 0 && (
        <ExchangeSelectionBar role="region" aria-label="GOLD TO GOLD 예상 확인 항목 선택">
          <div>
            <strong>{selectedItems.length}개 선택</strong>
            <span>
              기록 중량 {Number(selectedSummary.totalWeightG || 0).toFixed(2)}g
              {" · "}예상 순금 {Number(selectedSummary.pureGoldG || 0).toFixed(2)}g
              {" · "}실제 교환은 매장 실측 후 확정
            </span>
          </div>
          <button
            type="button"
            onClick={openSelectedItemsExchange}
            disabled={selectedItems.length === 0}
          >
            선택 금 예상 확인
          </button>
        </ExchangeSelectionBar>
      )}

      {error && !formOpen && <ErrorText role="alert">{error}</ErrorText>}

      {vaultLoading ? (
        <Empty>MY GOLD 기록을 불러오는 중입니다.</Empty>
      ) : sortedItems.length > 0 ? (
        <ItemList>
          {sortedItems.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <ItemCard key={item.id} $selecting={selectionMode} $selected={selected}>
                {selectionMode && (
                  <ItemSelectToggle>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelection(item.id)}
                      aria-label={`${item.label} 교환 선택`}
                    />
                  </ItemSelectToggle>
                )}

                <ItemMain>
                  <h3>{item.label}</h3>
                  <p>
                    {getGoldVaultTypeLabel(item.goldType, rates, item.productId)}
                    {item.note ? ` · ${item.note}` : ""}
                  </p>
                  <ItemMetrics>
                    <span>기록 <strong>{formatGramsAndDon(item.weightG)}</strong></span>
                    <span>예상 순금량 <strong>{Number(item.pureGoldG || 0).toFixed(2)}g</strong></span>
                    {publicPriceEnabled && (
                      <span>오늘 참고가치 <strong>{formatWon(item.estimatedValueWon)}</strong></span>
                    )}
                  </ItemMetrics>
                </ItemMain>

                {!selectionMode && (
                  <ItemActions>
                    <button
                      type="button"
                      data-variant="exchange"
                      onClick={() => openSingleItemExchange(item)}
                      aria-label={`${item.label} 금교환 계산`}
                      title="GOLD TO GOLD 교환 예상 확인"
                    >
                      교환 예상
                    </button>
                    <button type="button" onClick={() => onEdit(item)} aria-label={`${item.label} 수정`} title="수정">
                      수정
                    </button>
                    <button
                      type="button"
                      data-variant="danger"
                      onClick={() => onRemove(item)}
                      aria-label={`${item.label} 삭제`}
                      title="삭제"
                    >
                      삭제
                    </button>
                  </ItemActions>
                )}
              </ItemCard>
            );
          })}
        </ItemList>
      ) : (
        <Empty>
          <GoldSeed aria-hidden />
          <strong>아직 기록한 금이 없습니다.</strong>
          <span>금 하나를 기록하면 오늘 참고가치와 가격 변화를 바로 확인할 수 있습니다.</span>
          <AddGoldButton type="button" onClick={onAdd}>
            <Plus size={15} aria-hidden /> 첫 금 기록하기
          </AddGoldButton>
        </Empty>
      )}
    </VaultSection>
  );
}
