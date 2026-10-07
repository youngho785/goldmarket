export const MAX_HALLMARK_IMAGE_BYTES = 1_500_000;

export type HallmarkImageMimeType = "image/jpeg" | "image/png";

export type DecodedHallmarkImage = {
  bytes: Buffer;
  mimeType: HallmarkImageMimeType;
};

export class HallmarkImagePayloadError extends Error {
  constructor(
    public readonly reason:
      | "missing"
      | "invalid_base64"
      | "too_small"
      | "too_large"
      | "unsupported_format"
      | "mime_mismatch",
    message: string
  ) {
    super(message);
    this.name = "HallmarkImagePayloadError";
  }
}

function normalizeDeclaredMime(value: unknown): string {
  const mime = String(value || "").trim().toLowerCase();

  if (mime === "image/jpg") return "image/jpeg";
  return mime;
}

function detectImageMime(bytes: Buffer): HallmarkImageMimeType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  return null;
}

export function decodeHallmarkImagePayload(
  input: unknown
): DecodedHallmarkImage {
  if (!input || typeof input !== "object") {
    throw new HallmarkImagePayloadError(
      "missing",
      "촬영한 이미지가 없습니다."
    );
  }

  const data = input as Record<string, unknown>;
  let base64 = String(data.imageBase64 || "").trim();
  let declaredMime = normalizeDeclaredMime(data.mimeType);

  if (!base64) {
    throw new HallmarkImagePayloadError(
      "missing",
      "촬영한 이미지가 없습니다."
    );
  }

  const dataUrlMatch = base64.match(
    /^data:(image\/(?:jpeg|jpg|png));base64,([\s\S]+)$/i
  );

  if (dataUrlMatch) {
    const dataUrlMime = normalizeDeclaredMime(dataUrlMatch[1]);

    if (declaredMime && declaredMime !== dataUrlMime) {
      throw new HallmarkImagePayloadError(
        "mime_mismatch",
        "이미지 형식을 확인할 수 없습니다."
      );
    }

    declaredMime = dataUrlMime;
    base64 = dataUrlMatch[2];
  }

  base64 = base64.replace(/\s+/g, "");

  if (
    !base64 ||
    base64.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
  ) {
    throw new HallmarkImagePayloadError(
      "invalid_base64",
      "이미지 데이터를 읽을 수 없습니다."
    );
  }

  // Base64 문자열 자체가 지나치게 크면 디코딩 전에 차단합니다.
  const maxBase64Length =
    Math.ceil(MAX_HALLMARK_IMAGE_BYTES / 3) * 4 + 8;

  if (base64.length > maxBase64Length) {
    throw new HallmarkImagePayloadError(
      "too_large",
      "이미지가 너무 큽니다. 각인 부분을 가까이 촬영해 주세요."
    );
  }

  const bytes = Buffer.from(base64, "base64");

  if (bytes.length < 64) {
    throw new HallmarkImagePayloadError(
      "too_small",
      "이미지 데이터를 확인할 수 없습니다."
    );
  }

  if (bytes.length > MAX_HALLMARK_IMAGE_BYTES) {
    throw new HallmarkImagePayloadError(
      "too_large",
      "이미지가 너무 큽니다. 각인 부분을 가까이 촬영해 주세요."
    );
  }

  const detectedMime = detectImageMime(bytes);

  if (!detectedMime) {
    throw new HallmarkImagePayloadError(
      "unsupported_format",
      "JPEG 또는 PNG 이미지만 사용할 수 있습니다."
    );
  }

  if (declaredMime && declaredMime !== detectedMime) {
    throw new HallmarkImagePayloadError(
      "mime_mismatch",
      "이미지 형식을 확인할 수 없습니다."
    );
  }

  return {
    bytes,
    mimeType: detectedMime,
  };
}