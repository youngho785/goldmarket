import assert from "node:assert/strict";
import {
  decodeHallmarkImagePayload,
  HallmarkImagePayloadError,
  MAX_HALLMARK_IMAGE_BYTES,
} from "../lib/hallmark/imagePayload.js";

function jpegBytes(size = 128) {
  const value = Buffer.alloc(size);
  value[0] = 0xff;
  value[1] = 0xd8;
  value[2] = 0xff;
  return value;
}

function pngBytes(size = 128) {
  const value = Buffer.alloc(size);
  value[0] = 0x89;
  value[1] = 0x50;
  value[2] = 0x4e;
  value[3] = 0x47;
  value[4] = 0x0d;
  value[5] = 0x0a;
  value[6] = 0x1a;
  value[7] = 0x0a;
  return value;
}

{
  const bytes = jpegBytes();
  const result = decodeHallmarkImagePayload({
    imageBase64: bytes.toString("base64"),
    mimeType: "image/jpeg",
  });

  assert.equal(result.mimeType, "image/jpeg");
  assert.equal(result.bytes.length, bytes.length);
}

{
  const bytes = pngBytes();
  const result = decodeHallmarkImagePayload({
    imageBase64:
      `data:image/png;base64,${bytes.toString("base64")}`,
  });

  assert.equal(result.mimeType, "image/png");
}

{
  const bytes = jpegBytes();

  assert.throws(
    () =>
      decodeHallmarkImagePayload({
        imageBase64: bytes.toString("base64"),
        mimeType: "image/png",
      }),
    (error) =>
      error instanceof HallmarkImagePayloadError &&
      error.reason === "mime_mismatch"
  );
}

{
  assert.throws(
    () =>
      decodeHallmarkImagePayload({
        imageBase64: "not-base64@@@",
      }),
    (error) =>
      error instanceof HallmarkImagePayloadError &&
      error.reason === "invalid_base64"
  );
}

{
  const bytes = jpegBytes(
    MAX_HALLMARK_IMAGE_BYTES + 1
  );

  assert.throws(
    () =>
      decodeHallmarkImagePayload({
        imageBase64: bytes.toString("base64"),
      }),
    (error) =>
      error instanceof HallmarkImagePayloadError &&
      error.reason === "too_large"
  );
}

{
  const bytes = Buffer.alloc(128, 1);

  assert.throws(
    () =>
      decodeHallmarkImagePayload({
        imageBase64: bytes.toString("base64"),
      }),
    (error) =>
      error instanceof HallmarkImagePayloadError &&
      error.reason === "unsupported_format"
  );
}

console.log("Hallmark image payload tests PASS");