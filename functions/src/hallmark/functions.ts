import { createHash } from "node:crypto";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

import {
  db,
  ENFORCE_APP_CHECK,
} from "../core/runtime.js";
import {
  decodeHallmarkImagePayload,
  HallmarkImagePayloadError,
} from "./imagePayload.js";
import { decideAiHallmarkResult } from "./aiDecision.js";
import { analyzeVisibleHallmarkWithAi } from "./visibleMarkAi.js";

const GUEST_CALLS_PER_HOUR = 15;
const MEMBER_CALLS_PER_HOUR = 30;

function sha256(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function currentHourKey(now = new Date()): string {
  return now
    .toISOString()
    .slice(0, 13)
    .replace(/[-T]/g, "");
}

async function enforceHallmarkOcrRateLimit(
  uid: string,
  ip: string,
  userAgent: string
): Promise<void> {
  const authenticated = Boolean(uid);
  const limit = authenticated
    ? MEMBER_CALLS_PER_HOUR
    : GUEST_CALLS_PER_HOUR;

  const actorSource = authenticated
    ? `uid:${uid}`
    : `guest:${ip || "unknown"}:${userAgent.slice(0, 180)}`;

  const actorHash = sha256(actorSource).slice(0, 40);
  const hourKey = currentHourKey();

  const ref = db().doc(
    `hallmarkOcrRateLimits/${hourKey}_${actorHash}`
  );

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const previousCount = Number(snap.data()?.count || 0);

    if (
      !Number.isFinite(previousCount) ||
      previousCount < 0
    ) {
      throw new HttpsError(
        "internal",
        "호출 제한 상태를 확인하지 못했습니다."
      );
    }

    if (previousCount >= limit) {
      throw new HttpsError(
        "resource-exhausted",
        "각인 확인을 여러 번 시도했습니다. 잠시 후 다시 이용해 주세요."
      );
    }

    tx.set(
      ref,
      {
        count: previousCount + 1,
        authenticated,
        updatedAt: FieldValue.serverTimestamp(),

        // TTL 정책을 나중에 연결할 수 있도록 만료 시각만 기록합니다.
        // 원본 IP와 User-Agent는 저장하지 않습니다.
        expiresAt: Timestamp.fromMillis(
          Date.now() + 2 * 60 * 60 * 1000
        ),
      },
      { merge: true }
    );
  });
}

export const analyzeGoldHallmark = onCall(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 60,
    memory: "512MiB",
    maxInstances: 10,
  },
  async (req) => {
    let image;

    try {
      image = decodeHallmarkImagePayload(req.data);
    } catch (error) {
      if (error instanceof HallmarkImagePayloadError) {
        const code =
          error.reason === "too_large"
            ? "resource-exhausted"
            : "invalid-argument";

        throw new HttpsError(code, error.message);
      }

      throw error;
    }

    const uid = String(req.auth?.uid || "").trim();
    const ip = String(req.rawRequest.ip || "").trim();
    const userAgent = String(
      req.rawRequest.get("user-agent") || ""
    ).trim();

    await enforceHallmarkOcrRateLimit(
      uid,
      ip,
      userAgent
    );

    /*
     * =====================================================
     * Gemini-primary hallmark reader
     * =====================================================
     *
     * 기본 경로:
     * 원본 + 180° + 90° + 270°를
     * Gemini 한 번의 요청으로 함께 판독합니다.
     *
     * Gemini는 각인 문자를 읽는 보조 눈 역할만 하며
     * 실제 금 순도를 인증하지 않습니다.
     *
     * 제품 선택/안전 규칙은 기존 서버 코드가 담당합니다.
     *
     * 현재 운영 경로는 Gemini visibleMark 판독을 사용하며,
     * 오래된 Vision-first 경로는 최종 정리에서 제거합니다.
     */
    {

      const geminiStartedAt =
        Date.now();

      try {

        /*
         * Gemini-primary 기본 경로는 최대한 단순하게 유지합니다.
         *
         * 카메라가 촬영한 원본 사진 한 장을
         * 가공하지 않고 Gemini에 그대로 전달합니다.
         *
         * 회전 / 크롭 / 확대 / 대비보정 / Vision OCR은
         * 기본 판독 경로에서 사용하지 않습니다.
         */
        const aiResult =
          await analyzeVisibleHallmarkWithAi({
            bytes:
              image.bytes,

            mimeType:
              image.mimeType,
          });


        /*
         * AI 결과를 그대로 제품 선택으로 사용하지 않고
         * 기존 deterministic decision 규칙을 거칩니다.
         *
         * 예:
         * gold_18k -> 18K 후보
         * silver_925 -> 금 종류 선택 금지
         * platinum_950 -> 금 종류 선택 금지
         * plated -> 실금 자동판단 금지
         * low/unreadable -> 후보 없음
         * 999/999.9/24K -> 제품 형태 자동선택 금지
         */
        const decision =
          decideAiHallmarkResult(
            aiResult
          );

        const goldAccepted =
          Boolean(
            decision.accepted &&
            decision.material === "gold"
          );

        const suggestedMark =
          goldAccepted
            ? decision.suggestedMark
            : null;

        const suggestedLabel =
          goldAccepted
            ? decision.suggestedLabel
            : null;

        const suggestedProductId =
          goldAccepted
            ? decision.suggestedProductId
            : null;

        const requiresProductForm =
          Boolean(
            goldAccepted &&
            decision.requiresProductForm
          );

        const elapsedMs =
          Date.now() -
          geminiStartedAt;


        /*
         * 이미지와 AI 원문은 절대 로그에 기록하지 않습니다.
         */
        console.info(
          "[analyzeGoldHallmark] Gemini primary result",
          {
            visibleMark:
              aiResult.visibleMark,

            modifier:
              aiResult.modifier,

            material:
              aiResult.material,

            family:
              aiResult.family,

            confidence:
              aiResult.confidence,

            partial:
              aiResult.partial,

            accepted:
              decision.accepted,

            requiresProductForm,

            elapsedMs,

            imageBytes:
              image.bytes.length,

            viewCount:
              1,

            inputMode:
              "original",

            mimeType:
              image.mimeType,
          }
        );


        return {
          ok: true,

          /*
           * AI 결과는 deterministic OCR 확정값과 구분합니다.
           * 기존 클라이언트는 status 자체로
           * 후보 버튼을 결정하지 않습니다.
           */
          status:
            requiresProductForm
              ? "needs_product_form"
              : "not_found",

          textDetected:
            false,

          normalizedMark:
            null,

          candidates:
            [],

          matchConfidence:
            "low",

          requiresProductForm,

          /*
           * Gemini 결과는 자동 recommendation으로
           * 절대 승격하지 않습니다.
           */
          recommendationProductId:
            null,

          materialMarker:
            null,

          materialNormalizedMark:
            null,

          materialConflict:
            false,

          suggestedMark,

          suggestedLabel,

          suggestedProductId,

          suggestionConfidence:
            goldAccepted
              ? aiResult.confidence
              : null,

          aiUsed:
            true,

          aiMaterial:
            aiResult.material,

          aiFamily:
            aiResult.family,

          aiConfidence:
            aiResult.confidence,

          aiPartial:
            aiResult.partial,

          geminiPrimary:
            true,

          processingMs:
            elapsedMs,

          message:
            decision.message,
        };

      }
      catch (error) {

        const elapsedMs =
          Date.now() -
          geminiStartedAt;

        const aiError =
          error as {
            name?: unknown;
            message?: unknown;
            code?: unknown;
            status?: unknown;
          };

        const safeErrorMessage =
          typeof aiError?.message === "string"
            ? aiError.message
                .replace(/[\r\n]+/g, " ")
                .slice(0, 500)
            : null;

        /*
         * Gemini 장애 시 오래 걸리는 Vision 파이프라인을
         * 자동 실행하지 않습니다.
         *
         * 사용자는 즉시 직접 선택하거나
         * 다시 촬영할 수 있습니다.
         */
        console.warn(
          "[analyzeGoldHallmark] Gemini primary failed",
          {
            errorName:
              typeof aiError?.name === "string"
                ? aiError.name
                : "unknown",

            errorCode:
              typeof aiError?.code === "string" ||
              typeof aiError?.code === "number"
                ? String(aiError.code)
                : null,

            errorStatus:
              typeof aiError?.status === "string" ||
              typeof aiError?.status === "number"
                ? String(aiError.status)
                : null,

            errorMessage:
              safeErrorMessage,

            elapsedMs,
          }
        );


        return {
          ok: true,
          status: "not_found",
          textDetected: false,
          normalizedMark: null,
          candidates: [],
          matchConfidence: "low",
          requiresProductForm: false,
          recommendationProductId: null,
          materialMarker: null,
          materialNormalizedMark: null,
          materialConflict: false,
          suggestedMark: null,
          suggestedLabel: null,
          suggestedProductId: null,
          suggestionConfidence: null,
          aiUsed: true,
          aiMaterial: null,
          aiFamily: null,
          aiConfidence: null,
          aiPartial: null,
          geminiPrimary: true,
          processingMs: elapsedMs,
          message:
            "각인 확인에 일시적으로 실패했습니다. 다시 촬영하거나 금 종류를 직접 선택해 주세요.",
        };
      }
    }


  }
);