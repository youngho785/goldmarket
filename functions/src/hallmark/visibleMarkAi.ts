import type {
  GoogleGenAI,
  ThinkingLevel,
} from "@google/genai";

import type {
  AiHallmarkResult,
} from "./aiHallmark.js";


export const VISIBLE_HALLMARK_MODEL =
  "gemini-3.6-flash";


const VISIBLE_MARKS = [
  "UNKNOWN",

  "585",
  "14K",
  "K14",
  "14KT",
  "KT14",

  "750",
  "18K",
  "K18",
  "18KT",
  "KT18",

  "995",
  "99.5",

  "999",
  "99.9",

  "999.9",
  "9999",
  "99.99",

  "24K",
  "K24",
  "24KT",
  "KT24",

  "925",
  "S925",
  "STERLING",

  "PT950",
  "PLATINUM 950",
] as const;


const PLATING_MODIFIERS = [
  "NONE",
  "GP",
  "GF",
  "GEP",
  "HGE",
  "RGP",
  "GE",
  "EP",
] as const;


type VisibleMark =
  (typeof VISIBLE_MARKS)[number];

type PlatingModifier =
  (typeof PLATING_MODIFIERS)[number];

type VisibleConfidence =
  "high" | "medium" | "low";


type RawVisibleHallmarkResult = {
  visibleMark: VisibleMark;
  modifier: PlatingModifier;
  confidence: VisibleConfidence;
  partial: boolean;
  conflict: boolean;
};


export type VisibleHallmarkAiResult =
  AiHallmarkResult & {
    visibleMark: VisibleMark;
    modifier: PlatingModifier;
  };


const RESPONSE_SCHEMA = {
  type: "object",

  properties: {
    visibleMark: {
      type: "string",
      enum: [...VISIBLE_MARKS],
    },

    modifier: {
      type: "string",
      enum: [...PLATING_MODIFIERS],
    },

    confidence: {
      type: "string",
      enum: [
        "high",
        "medium",
        "low",
      ],
    },

    partial: {
      type: "boolean",
    },

    conflict: {
      type: "boolean",
    },
  },

  required: [
    "visibleMark",
    "modifier",
    "confidence",
    "partial",
    "conflict",
  ],

  additionalProperties: false,
} as const;


const PROMPT = `
Read ONLY the visible jewelry hallmark characters in this photo.

Your job is character reading, not material identification.

Do not infer metal, purity, or authenticity from:
- color
- shine
- shape
- jewelry design
- surrounding context

Do not certify purity.
Do not guess missing characters.
Ignore manufacturer initials or unrelated engraving.

Choose visibleMark only from the allowed schema values.

Examples:
- visibly stamped K18 -> visibleMark K18
- visibly stamped 750 -> visibleMark 750
- visibly stamped 585 -> visibleMark 585
- visibly stamped 999 or 99.9 -> return exactly the visible form
- visibly stamped 999.9 -> visibleMark 999.9
- visibly stamped 925 -> visibleMark 925
- visibly stamped S925 -> visibleMark S925
- visibly stamped PT950 -> visibleMark PT950

Plating:
If GP, GF, GEP, HGE, RGP, GE, or EP is visibly attached to
or clearly associated with the hallmark, return it in modifier.

For example:
18KGP -> visibleMark 18K, modifier GP.

If the mark cannot be read reliably:
visibleMark = UNKNOWN.

If two incompatible hallmark readings are both genuinely visible:
conflict = true and visibleMark = UNKNOWN.

Confidence:
- high: characters are clearly readable
- medium: likely readable but slightly blurred or incomplete
- low: uncertain

Be conservative.
It is better to return UNKNOWN than invent a hallmark.
`.trim();


let clientPromise:
  Promise<GoogleGenAI> | null =
    null;


function resolveProjectId(): string {

  const direct =
    String(
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      ""
    ).trim();

  if (direct) {
    return direct;
  }

  const firebaseConfig =
    String(
      process.env.FIREBASE_CONFIG ||
      ""
    ).trim();

  if (firebaseConfig) {
    try {
      const parsed =
        JSON.parse(firebaseConfig) as {
          projectId?: unknown;
        };

      if (
        typeof parsed.projectId ===
          "string" &&
        parsed.projectId.trim()
      ) {
        return parsed.projectId.trim();
      }
    }
    catch {
      // fall through
    }
  }

  return "goldmarket-0";
}


async function getClient():
  Promise<GoogleGenAI> {

  if (!clientPromise) {

    clientPromise =
      import("@google/genai")
        .then(
          ({ GoogleGenAI }) =>
            new GoogleGenAI({
              vertexai: true,
              project:
                resolveProjectId(),
              location:
                "global",
            })
        );
  }

  return clientPromise;
}


function isVisibleMark(
  value: unknown
): value is VisibleMark {

  return (
    typeof value === "string" &&
    (
      VISIBLE_MARKS as
        readonly string[]
    ).includes(value)
  );
}


function isModifier(
  value: unknown
): value is PlatingModifier {

  return (
    typeof value === "string" &&
    (
      PLATING_MODIFIERS as
        readonly string[]
    ).includes(value)
  );
}


function isConfidence(
  value: unknown
): value is VisibleConfidence {

  return (
    value === "high" ||
    value === "medium" ||
    value === "low"
  );
}


function parseRawResponse(
  responseText: string
): RawVisibleHallmarkResult {

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(responseText);
  }
  catch {
    throw new Error(
      "hallmark-visible-response-json-invalid"
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new Error(
      "hallmark-visible-response-invalid"
    );
  }

  const record =
    parsed as Record<string, unknown>;

  if (
    !isVisibleMark(
      record.visibleMark
    ) ||
    !isModifier(
      record.modifier
    ) ||
    !isConfidence(
      record.confidence
    ) ||
    typeof record.partial !==
      "boolean" ||
    typeof record.conflict !==
      "boolean"
  ) {
    throw new Error(
      "hallmark-visible-response-shape-invalid"
    );
  }

  return {
    visibleMark:
      record.visibleMark,

    modifier:
      record.modifier,

    confidence:
      record.confidence,

    partial:
      record.partial,

    conflict:
      record.conflict,
  };
}


function normalizedVisibleMark(
  mark: VisibleMark
): string {

  return mark
    .toUpperCase()
    .replace(/\s+/g, "");
}


export function mapVisibleHallmarkResult(
  raw: RawVisibleHallmarkResult
): VisibleHallmarkAiResult {

  /*
   * 서로 충돌하는 표시가 보이면
   * 어떤 금 후보도 생성하지 않습니다.
   */
  if (raw.conflict) {
    return {
      material: "other",
      family: "other",
      confidence: "low",
      partial: raw.partial,
      reasonCode: "conflict",

      visibleMark:
        "UNKNOWN",

      modifier:
        "NONE",
    };
  }


  /*
   * GP/GF/GEP/HGE/RGP/GE/EP가 보이면
   * 금 함량 숫자가 함께 있어도
   * 실금 제품으로 제안하지 않습니다.
   */
  if (raw.modifier !== "NONE") {
    return {
      material: "plated",
      family: "plated",
      confidence:
        raw.confidence,
      partial:
        raw.partial,
      reasonCode:
        "material_marker",

      visibleMark:
        raw.visibleMark,

      modifier:
        raw.modifier,
    };
  }


  const mark =
    normalizedVisibleMark(
      raw.visibleMark
    );

  let material:
    AiHallmarkResult["material"];

  let family:
    AiHallmarkResult["family"];


  switch (mark) {

    case "585":
    case "14K":
    case "K14":
    case "14KT":
    case "KT14":
      material = "gold";
      family = "gold_14k";
      break;


    case "750":
    case "18K":
    case "K18":
    case "18KT":
    case "KT18":
      material = "gold";
      family = "gold_18k";
      break;


    case "995":
    case "99.5":
      material = "gold";
      family = "gold_995";
      break;


    case "999":
    case "99.9":
      material = "gold";
      family = "gold_999";
      break;


    case "999.9":
    case "9999":
    case "99.99":
      material = "gold";
      family = "gold_9999";
      break;


    case "24K":
    case "K24":
    case "24KT":
    case "KT24":
      material = "gold";
      family = "gold_24k";
      break;


    case "925":
    case "S925":
    case "STERLING":
      material = "silver";
      family = "silver_925";
      break;


    case "PT950":
    case "PLATINUM950":
      material = "platinum";
      family = "platinum_950";
      break;


    default:
      return {
        material:
          "unreadable",

        family:
          "unknown",

        confidence:
          "low",

        partial:
          raw.partial,

        reasonCode:
          "unreadable",

        visibleMark:
          "UNKNOWN",

        modifier:
          "NONE",
      };
  }


  return {
    material,
    family,

    confidence:
      raw.confidence,

    partial:
      raw.partial,

    reasonCode:
      raw.partial
        ? "partial_hallmark"
        : "clear_hallmark",

    visibleMark:
      raw.visibleMark,

    modifier:
      raw.modifier,
  };
}


export async function analyzeVisibleHallmarkWithAi(
  input: {
    bytes: Buffer;

    mimeType:
      | "image/jpeg"
      | "image/png";
  }
): Promise<VisibleHallmarkAiResult> {

  if (
    !Buffer.isBuffer(input.bytes) ||
    input.bytes.length === 0
  ) {
    throw new Error(
      "hallmark-visible-image-empty"
    );
  }

  if (
    input.mimeType !==
      "image/jpeg" &&
    input.mimeType !==
      "image/png"
  ) {
    throw new Error(
      "hallmark-visible-image-type-invalid"
    );
  }


  const client =
    await getClient();


  const response =
    await client.models.generateContent({
      model:
        VISIBLE_HALLMARK_MODEL,

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

        /*
         * 각인 한두 글자를 읽는 작업이므로
         * 깊은 추론을 사용하지 않습니다.
         */
        thinkingConfig: {
          thinkingLevel:
            "MINIMAL" as ThinkingLevel,
        },

        maxOutputTokens:
          80,

        responseMimeType:
          "application/json",

        responseJsonSchema:
          RESPONSE_SCHEMA,

        /*
         * 사용자가 40~60초를 기다리는 상황을
         * 다시 만들지 않습니다.
         */
        httpOptions: {
          timeout:
            15000,

          /*
           * JS SDK 일부 버전에서도
           * 서버 timeout header가 함께 적용되도록
           * 명시적으로 빈 headers를 둡니다.
           */
          headers: {},
        },
      },
    });


  const responseText =
    typeof response.text ===
      "string"
      ? response.text.trim()
      : "";


  if (!responseText) {

    const finishReason =
      response.candidates?.[0]
        ?.finishReason ||
      "unknown";

    throw new Error(
      "hallmark-visible-response-empty:" +
      finishReason
    );
  }


  const rawResult =
    parseRawResponse(
      responseText
    );


  return mapVisibleHallmarkResult(
    rawResult
  );
}
