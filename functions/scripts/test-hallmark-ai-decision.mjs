import assert from "node:assert/strict";

const {
  decideAiHallmarkResult,
} = await import(
  "../lib/hallmark/aiDecision.js"
);

/*
 * 18K high
 */
{
  const result =
    decideAiHallmarkResult({
      material: "gold",
      family: "gold_18k",
      confidence: "high",
      partial: false,
      reasonCode: "clear_hallmark",
    });

  assert.equal(result.accepted, true);
  assert.equal(result.material, "gold");
  assert.equal(result.suggestedMark, "750");
  assert.equal(
    result.suggestedProductId,
    "gold-18k-jewelry"
  );
}

/*
 * 흐릿한 14K medium도
 * 가능성 제안은 허용하되 자동 확정은 하지 않음.
 */
{
  const result =
    decideAiHallmarkResult({
      material: "gold",
      family: "gold_14k",
      confidence: "medium",
      partial: true,
      reasonCode: "partial_hallmark",
    });

  assert.equal(result.accepted, true);
  assert.equal(result.suggestedMark, "585");
  assert.match(
    result.message,
    /가능성이 있습니다/
  );
}

/*
 * AI low confidence는 금 후보를 만들지 않음.
 */
{
  const result =
    decideAiHallmarkResult({
      material: "gold",
      family: "gold_18k",
      confidence: "low",
      partial: true,
      reasonCode: "partial_hallmark",
    });

  assert.equal(result.accepted, false);
  assert.equal(
    result.suggestedProductId,
    null
  );
  assert.equal(
    result.suggestedMark,
    null
  );
}

/*
 * 925는 절대 금 후보가 되면 안 됨.
 */
{
  const result =
    decideAiHallmarkResult({
      material: "silver",
      family: "silver_925",
      confidence: "high",
      partial: false,
      reasonCode: "clear_hallmark",
    });

  assert.equal(result.material, "silver");
  assert.equal(
    result.suggestedProductId,
    null
  );
  assert.equal(
    result.suggestedMark,
    null
  );
}

/*
 * PT950 역시 금 후보 0개.
 */
{
  const result =
    decideAiHallmarkResult({
      material: "platinum",
      family: "platinum_950",
      confidence: "high",
      partial: false,
      reasonCode: "clear_hallmark",
    });

  assert.equal(
    result.suggestedProductId,
    null
  );
}

/*
 * GP/GF 계열도 금 후보 0개.
 */
{
  const result =
    decideAiHallmarkResult({
      material: "plated",
      family: "plated",
      confidence: "high",
      partial: false,
      reasonCode: "material_marker",
    });

  assert.equal(result.material, "plated");
  assert.equal(
    result.suggestedProductId,
    null
  );
}

/*
 * 999.9는 AI가 읽어도 제품 형태 자동 선택 금지.
 */
{
  const result =
    decideAiHallmarkResult({
      material: "gold",
      family: "gold_9999",
      confidence: "high",
      partial: false,
      reasonCode: "clear_hallmark",
    });

  assert.equal(
    result.suggestedMark,
    "999.9"
  );

  assert.equal(
    result.suggestedProductId,
    null
  );

  assert.equal(
    result.requiresProductForm,
    true
  );
}

/*
 * low silver confidence must be rejected
 */
{
  const result =
    decideAiHallmarkResult({
      material: "silver",
      family: "silver_925",
      confidence: "low",
      partial: true,
      reasonCode: "partial_hallmark",
    });

  assert.equal(
    result.accepted,
    false
  );

  assert.equal(
    result.suggestedProductId,
    null
  );
}

/*
 * low plated confidence must be rejected
 */
{
  const result =
    decideAiHallmarkResult({
      material: "plated",
      family: "plated",
      confidence: "low",
      partial: true,
      reasonCode: "material_marker",
    });

  assert.equal(
    result.accepted,
    false
  );

  assert.equal(
    result.suggestedProductId,
    null
  );
}

console.log(
  "Hallmark AI decision safety tests PASS"
);
