import type {
  AiHallmarkResult,
} from "./aiHallmark.js";

export type AiHallmarkDecision = {
  accepted: boolean;
  material:
    | "gold"
    | "silver"
    | "platinum"
    | "plated"
    | "other"
    | "unreadable";

  suggestedMark: string | null;
  suggestedLabel: string | null;
  suggestedProductId: string | null;

  requiresProductForm: boolean;

  message: string;
};

type GoldFamilyMapping = {
  mark: string;
  label: string;
  productId: string | null;
  requiresProductForm: boolean;
};

const GOLD_FAMILIES:
  Record<string, GoldFamilyMapping> = {
    gold_14k: {
      mark: "585",
      label: "14K(585) 제품",
      productId: "gold-14k-jewelry",
      requiresProductForm: false,
    },

    gold_18k: {
      mark: "750",
      label: "18K(750) 제품",
      productId: "gold-18k-jewelry",
      requiresProductForm: false,
    },

    gold_995: {
      mark: "995",
      label: "순금 99.5% 제품",
      productId: "gold-995-product",
      requiresProductForm: false,
    },

    gold_999: {
      mark: "999",
      label: "순금 99.9% 계열",
      productId: null,
      requiresProductForm: true,
    },

    gold_9999: {
      mark: "999.9",
      label: "순금 999.9 계열",
      productId: null,
      requiresProductForm: true,
    },

    gold_24k: {
      mark: "24K",
      label: "24K 순금 계열",
      productId: null,
      requiresProductForm: true,
    },
  };

/*
 * AI는 보조 판독기입니다.
 *
 * high / medium만 사용자에게 "가능성"으로 제시합니다.
 * low는 금 종류 후보를 만들지 않습니다.
 *
 * AI가 제시한 금 후보 역시 recommendationProductId가 아니라
 * suggestedProductId로만 내려가므로 사용자가 직접 확인 후
 * 버튼을 눌러야 선택됩니다.
 */
export function decideAiHallmarkResult(
  result: AiHallmarkResult
): AiHallmarkDecision {

  /*
   * low confidence는 금/은/백금/도금 모두
   * 사용자에게 재질이나 종류를 제안하지 않습니다.
   */
  if (result.confidence === "low") {
    return {
      accepted: false,
      material:
        result.material,
      suggestedMark: null,
      suggestedLabel: null,
      suggestedProductId: null,
      requiresProductForm: false,
      message:
        "각인은 보이지만 정확히 읽기 어렵습니다. 카메라에서 2~3배 확대한 뒤 각인에 초점을 맞춰 다시 촬영해 주세요. 빛이 반사되면 휴대폰 각도를 살짝 바꿔 주세요.",
    };
  }

  if (result.material === "silver") {
    return {
      accepted: true,
      material: "silver",
      suggestedMark: null,
      suggestedLabel: null,
      suggestedProductId: null,
      requiresProductForm: false,
      message:
        "925 계열 각인일 가능성이 있습니다. 일반적으로 은 제품에 사용되는 표시이며 금 종류로 선택하지 않습니다.",
    };
  }

  if (result.material === "platinum") {
    return {
      accepted: true,
      material: "platinum",
      suggestedMark: null,
      suggestedLabel: null,
      suggestedProductId: null,
      requiresProductForm: false,
      message:
        "PT950 계열 각인일 가능성이 있습니다. 일반적으로 백금 제품에 사용되는 표시이며 금 종류로 선택하지 않습니다.",
    };
  }

  if (result.material === "plated") {
    return {
      accepted: true,
      material: "plated",
      suggestedMark: null,
      suggestedLabel: null,
      suggestedProductId: null,
      requiresProductForm: false,
      message:
        "도금·금장 계열 표시일 가능성이 있습니다. 실금 제품으로 자동 판단하지 않습니다.",
    };
  }

  if (
    result.material === "other" ||
    result.material === "unreadable"
  ) {
    return {
      accepted: false,
      material: result.material,
      suggestedMark: null,
      suggestedLabel: null,
      suggestedProductId: null,
      requiresProductForm: false,
      message:
        "각인을 명확히 확인하지 못했습니다. 금 종류를 직접 선택하거나 다시 촬영해 주세요.",
    };
  }

  const family =
    GOLD_FAMILIES[result.family];

  if (!family) {
    return {
      accepted: false,
      material: "unreadable",
      suggestedMark: null,
      suggestedLabel: null,
      suggestedProductId: null,
      requiresProductForm: false,
      message:
        "각인을 명확히 확인하지 못했습니다. 금 종류를 직접 선택하거나 다시 촬영해 주세요.",
    };
  }

  const partialNote =
    result.partial
      ? " 각인 일부가 흐리거나 가려져 있어 확정할 수 없습니다."
      : " 촬영만으로 실제 금 순도를 확정할 수 없습니다.";

  return {
    accepted: true,
    material: "gold",

    suggestedMark:
      family.mark,

    suggestedLabel:
      family.label,

    suggestedProductId:
      family.productId,

    requiresProductForm:
      family.requiresProductForm,

    message:
      `${family.label} 각인일 가능성이 있습니다.${partialNote} 실제 각인을 확인한 뒤 선택해 주세요.`,
  };
}
