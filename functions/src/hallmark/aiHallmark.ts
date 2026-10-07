import type {
  GoogleGenAI,
  Part,
  ThinkingLevel,
} from "@google/genai";

export type AiHallmarkMaterial =
  | "gold"
  | "silver"
  | "platinum"
  | "plated"
  | "other"
  | "unreadable";

export type AiHallmarkFamily =
  | "gold_14k"
  | "gold_18k"
  | "gold_995"
  | "gold_999"
  | "gold_9999"
  | "gold_24k"
  | "silver_925"
  | "platinum_950"
  | "plated"
  | "other"
  | "unknown";

export type AiHallmarkConfidence =
  | "high"
  | "medium"
  | "low";

export type AiHallmarkReason =
  | "clear_hallmark"
  | "partial_hallmark"
  | "material_marker"
  | "conflict"
  | "unreadable";

export type AiHallmarkResult = {
  material: AiHallmarkMaterial;
  family: AiHallmarkFamily;
  confidence: AiHallmarkConfidence;
  partial: boolean;
  reasonCode: AiHallmarkReason;
};

export const AI_HALLMARK_MODEL =
  "gemini-3.5-flash";

export const AI_HALLMARK_LOCATION =
  "global";

const MATERIALS: readonly AiHallmarkMaterial[] = [
  "gold",
  "silver",
  "platinum",
  "plated",
  "other",
  "unreadable",
];

const FAMILIES: readonly AiHallmarkFamily[] = [
  "gold_14k",
  "gold_18k",
  "gold_995",
  "gold_999",
  "gold_9999",
  "gold_24k",
  "silver_925",
  "platinum_950",
  "plated",
  "other",
  "unknown",
];

const CONFIDENCES:
  readonly AiHallmarkConfidence[] = [
    "high",
    "medium",
    "low",
  ];

const REASONS: readonly AiHallmarkReason[] = [
  "clear_hallmark",
  "partial_hallmark",
  "material_marker",
  "conflict",
  "unreadable",
];

const FAMILY_BY_MATERIAL:
  Record<
    AiHallmarkMaterial,
    readonly AiHallmarkFamily[]
  > = {
    gold: [
      "gold_14k",
      "gold_18k",
      "gold_995",
      "gold_999",
      "gold_9999",
      "gold_24k",
    ],
    silver: [
      "silver_925",
    ],
    platinum: [
      "platinum_950",
    ],
    plated: [
      "plated",
    ],
    other: [
      "other",
    ],
    unreadable: [
      "unknown",
    ],
  };

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "material",
    "family",
    "confidence",
    "partial",
    "reasonCode",
  ],
  properties: {
    material: {
      type: "string",
      enum: MATERIALS,
    },
    family: {
      type: "string",
      enum: FAMILIES,
    },
    confidence: {
      type: "string",
      enum: CONFIDENCES,
    },
    partial: {
      type: "boolean",
    },
    reasonCode: {
      type: "string",
      enum: REASONS,
    },
  },
} as const;

const PROMPT = `
You are a visual jewelry hallmark reader.

Your only task is to inspect visible stamped or engraved hallmark characters.

Important rules:
- Do NOT infer metal or purity from color, shine, shape, or jewelry style.
- Do NOT certify actual purity.
- Do NOT invent missing characters.
- The hallmark may be upside down, sideways, rotated, deeply engraved, shadowed, reflective, blurred, or partly outside the image.
- Treat partial or uncertain characters conservatively.
- If the mark cannot be read reliably, return unreadable/unknown.

Recognize these families only:

Gold:
- 585, 14K, K14, 14KT, KT14 => gold_14k
- 750, 18K, K18, 18KT, KT18 => gold_18k
- 995, 99.5 => gold_995
- 999, 99.9 => gold_999
- 999.9, 9999, 99.99 => gold_9999
- 24K, K24, 24KT, KT24 => gold_24k

Silver:
- 925, S925, STERLING => silver_925

Platinum:
- PT950, PLATINUM 950 => platinum_950

Plated / non-solid-gold markers:
- GP, GF, GEP, HGE, RGP, GE, EP => plated

If a plating marker appears with a gold-looking number,
classify it as plated, not solid gold.

If incompatible material marks conflict,
use other/other with reasonCode conflict.

Return only the required structured result.
`.trim();

const MULTIVIEW_PROMPT = [
  "You are performing a conservative second verification of a jewelry hallmark.",
  "",
  "All supplied images come from the SAME physical photograph.",
  "Some views may be rotated, cropped, enlarged, or contrast-enhanced.",
  "They are NOT independent pieces of evidence.",
  "Use the different views only to read the same physical engraving more reliably.",
  "",
  "Rules:",
  "- Inspect visible stamped or engraved characters only.",
  "- Do NOT infer metal or purity from color, shine, shape, or jewelry style.",
  "- Do NOT certify actual purity.",
  "- Do NOT invent missing characters.",
  "- If plausible readings disagree across rotations, return unreadable/unknown with reasonCode conflict.",
  "- If the engraving cannot be read reliably, return unreadable/unknown.",
  "",
  "Allowed families:",
  "585 / 14K / K14 / 14KT / KT14 => gold_14k",
  "750 / 18K / K18 / 18KT / KT18 => gold_18k",
  "995 / 99.5 => gold_995",
  "999 / 99.9 => gold_999",
  "999.9 / 9999 / 99.99 => gold_9999",
  "24K / K24 / 24KT / KT24 => gold_24k",
  "925 / S925 / STERLING => silver_925",
  "PT950 / PLATINUM 950 => platinum_950",
  "GP / GF / GEP / HGE / RGP / GE / EP => plated",
  "",
  "If a plating marker appears with a gold-looking number, classify it as plated.",
  "Return only the required structured result."
].join("\n");


let clientPromise:
  Promise<GoogleGenAI> | null = null;

async function getGenAiClient():
  Promise<GoogleGenAI> {

  if (!clientPromise) {
    clientPromise =
      import("@google/genai").then(
        ({ GoogleGenAI }) => {
          const project =
            process.env.GCLOUD_PROJECT ||
            process.env.GOOGLE_CLOUD_PROJECT ||
            "goldmarket-0";

          return new GoogleGenAI({
            vertexai: true,
            project,
            location:
              AI_HALLMARK_LOCATION,
          });
        }
      );
  }

  return clientPromise;
}

function includesValue<T extends string>(
  values: readonly T[],
  value: unknown
): value is T {
  return (
    typeof value === "string" &&
    values.includes(value as T)
  );
}

export function parseAiHallmarkResponse(
  rawValue: unknown
): AiHallmarkResult {

  let value: unknown = rawValue;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error(
        "hallmark-ai-response-json-invalid"
      );
    }
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "hallmark-ai-response-invalid"
    );
  }

  const record =
    value as Record<string, unknown>;

  if (
    !includesValue(
      MATERIALS,
      record.material
    ) ||
    !includesValue(
      FAMILIES,
      record.family
    ) ||
    !includesValue(
      CONFIDENCES,
      record.confidence
    ) ||
    typeof record.partial !==
      "boolean" ||
    !includesValue(
      REASONS,
      record.reasonCode
    )
  ) {
    throw new Error(
      "hallmark-ai-response-fields-invalid"
    );
  }

  if (
    !FAMILY_BY_MATERIAL[
      record.material
    ].includes(record.family)
  ) {
    throw new Error(
      "hallmark-ai-material-family-conflict"
    );
  }

  return {
    material: record.material,
    family: record.family,
    confidence: record.confidence,
    partial: record.partial,
    reasonCode: record.reasonCode,
  };
}

export async function analyzeHallmarkWithAi(
  input: {
    bytes: Buffer;
    mimeType: "image/jpeg" | "image/png";
  }
): Promise<AiHallmarkResult> {

  if (
    !Buffer.isBuffer(input.bytes) ||
    input.bytes.length === 0
  ) {
    throw new Error(
      "hallmark-ai-image-empty"
    );
  }

  if (
    input.mimeType !== "image/jpeg" &&
    input.mimeType !== "image/png"
  ) {
    throw new Error(
      "hallmark-ai-image-type-invalid"
    );
  }

  const client =
    await getGenAiClient();

  const response =
    await client.models.generateContent({
      model: AI_HALLMARK_MODEL,

      contents: [
        {
          inlineData: {
            mimeType:
              input.mimeType,
            data:
              input.bytes.toString(
                "base64"
              ),
          },
        },
        PROMPT,
      ],

      config: {
        thinkingConfig: {
          thinkingLevel:
            "MINIMAL" as ThinkingLevel,
        },

        maxOutputTokens: 256,

        responseMimeType:
          "application/json",

        responseJsonSchema:
          RESPONSE_SCHEMA,
      },
    });

  /*
   * AI 응답 원문은 로그에 남기지 않습니다.
   * JSON 본문이 비어 있다면 finishReason만 오류에 포함합니다.
   */
  const responseText =
    typeof response.text === "string"
      ? response.text.trim()
      : "";

  if (!responseText) {
    const finishReason =
      response.candidates?.[0]
        ?.finishReason ||
      "unknown";

    throw new Error(
      `hallmark-ai-response-empty:${finishReason}`
    );
  }

  return parseAiHallmarkResponse(
    responseText
  );
}


export async function analyzeHallmarkWithAiMultiView(
  input: {
    images: readonly {
      bytes: Buffer;
      mimeType:
        | "image/jpeg"
        | "image/png";
    }[];
  }
): Promise<AiHallmarkResult> {

  if (
    !Array.isArray(input.images) ||
    input.images.length < 2 ||
    input.images.length > 4
  ) {
    throw new Error(
      "hallmark-ai-multiview-count-invalid"
    );
  }

  const parts: Part[] = [
    {
      text: MULTIVIEW_PROMPT,
    },
  ];

  for (
    let index = 0;
    index < input.images.length;
    index++
  ) {
    const image =
      input.images[index];

    if (
      !Buffer.isBuffer(image.bytes) ||
      image.bytes.length === 0
    ) {
      throw new Error(
        "hallmark-ai-multiview-image-empty"
      );
    }

    if (
      image.mimeType !== "image/jpeg" &&
      image.mimeType !== "image/png"
    ) {
      throw new Error(
        "hallmark-ai-multiview-type-invalid"
      );
    }

    parts.push({
      text:
        "View " +
        String(index + 1) +
        " of the same photograph.",
    });

    parts.push({
      inlineData: {
        mimeType:
          image.mimeType,

        data:
          image.bytes.toString(
            "base64"
          ),
      },
    });
  }

  const client =
    await getGenAiClient();

  const response =
    await client.models.generateContent({
      model:
        AI_HALLMARK_MODEL,

      contents: [
        {
          role: "user",
          parts,
        },
      ],

      config: {
        thinkingConfig: {
          thinkingLevel:
            "MINIMAL" as ThinkingLevel,
        },

        maxOutputTokens: 256,

        responseMimeType:
          "application/json",

        responseJsonSchema:
          RESPONSE_SCHEMA,
      },
    });

  const responseText =
    typeof response.text === "string"
      ? response.text.trim()
      : "";

  if (!responseText) {
    const finishReason =
      response.candidates?.[0]
        ?.finishReason ||
      "unknown";

    throw new Error(
      "hallmark-ai-multiview-empty:" +
      finishReason
    );
  }

  return parseAiHallmarkResponse(
    responseText
  );
}
