import assert from "node:assert/strict";

const {
  VISIBLE_HALLMARK_MODEL,
  mapVisibleHallmarkResult,
} = await import(
  "../lib/hallmark/visibleMarkAi.js"
);


assert.equal(
  VISIBLE_HALLMARK_MODEL,
  "gemini-3.6-flash"
);


function map(
  visibleMark,
  {
    modifier = "NONE",
    confidence = "high",
    partial = false,
    conflict = false,
  } = {}
) {

  return mapVisibleHallmarkResult({
    visibleMark,
    modifier,
    confidence,
    partial,
    conflict,
  });
}


/* 14K */
assert.equal(
  map("585").family,
  "gold_14k"
);

assert.equal(
  map("K14").family,
  "gold_14k"
);


/* 18K */
assert.equal(
  map("750").family,
  "gold_18k"
);

assert.equal(
  map("18K").family,
  "gold_18k"
);

assert.equal(
  map("K18").family,
  "gold_18k"
);


/* 99.5 */
assert.equal(
  map("995").family,
  "gold_995"
);

assert.equal(
  map("99.5").family,
  "gold_995"
);


/* 99.9 */
assert.equal(
  map("999").family,
  "gold_999"
);

assert.equal(
  map("99.9").family,
  "gold_999"
);


/* 999.9 */
assert.equal(
  map("999.9").family,
  "gold_9999"
);

assert.equal(
  map("9999").family,
  "gold_9999"
);

assert.equal(
  map("99.99").family,
  "gold_9999"
);


/* 24K */
assert.equal(
  map("24K").family,
  "gold_24k"
);


/* Silver */
{
  const result =
    map("925");

  assert.equal(
    result.material,
    "silver"
  );

  assert.equal(
    result.family,
    "silver_925"
  );
}


/* Platinum */
{
  const result =
    map("PT950");

  assert.equal(
    result.material,
    "platinum"
  );

  assert.equal(
    result.family,
    "platinum_950"
  );
}


/*
 * 18KGP 같은 표시는
 * 절대 18K 실금으로 전달하지 않음
 */
{
  const result =
    map(
      "18K",
      {
        modifier: "GP",
      }
    );

  assert.equal(
    result.material,
    "plated"
  );

  assert.equal(
    result.family,
    "plated"
  );
}


/* UNKNOWN */
{
  const result =
    map(
      "UNKNOWN"
    );

  assert.equal(
    result.material,
    "unreadable"
  );

  assert.equal(
    result.family,
    "unknown"
  );

  assert.equal(
    result.confidence,
    "low"
  );
}


/* Conflict */
{
  const result =
    map(
      "18K",
      {
        conflict: true,
      }
    );

  assert.equal(
    result.material,
    "other"
  );

  assert.equal(
    result.reasonCode,
    "conflict"
  );
}


/* partial 유지 */
{
  const result =
    map(
      "750",
      {
        confidence:
          "medium",

        partial:
          true,
      }
    );

  assert.equal(
    result.family,
    "gold_18k"
  );

  assert.equal(
    result.confidence,
    "medium"
  );

  assert.equal(
    result.partial,
    true
  );
}


console.log(
  "Hallmark Gemini 3.6 visibleMark mapping tests PASS"
);
