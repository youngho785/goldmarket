// src/utils/imageCompression.js

/** 이미지 엘리먼트 로더 (ObjectURL 자동 revoke) */
export const loadImageEl = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });

/** WebP 인코딩 가능 여부 */
export const canEncodeWebP = () => {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
};

/** contain 방식으로 리사이즈된 폭/높이 계산 */
const containSize = (w, h, maxW, maxH) => {
  const r = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * r), height: Math.round(h * r) };
};

/** canvas -> blob */
const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * 단일 이미지 압축
 * - 큰 쪽이 maxW/maxH를 넘으면 축소
 * - preferMime이 webp인데 브라우저가 미지원이면 jpeg로 자동 폴백
 * - targetMaxBytes 지정 시 그 크기 이하가 될 때까지 품질을 점진적으로 낮춤
 */
export async function compressImage(
  file,
  {
    maxW = 2048,
    maxH = 2048,
    quality = 0.82,
    minQuality = 0.5,
    preferMime = "image/jpeg",   // "image/webp"도 가능
    targetMaxBytes,              // 예: 1_200_000 (≈1.2MB)
  } = {}
) {
  // mime 결정 (webp 미지원 시 jpeg 폴백)
  const wanted = preferMime || "image/jpeg";
  const wantedMime =
    wanted === "image/webp" && !canEncodeWebP() ? "image/jpeg" : wanted;

  // PNG는 항상 PNG로 유지(투명도 보존), 그 외는 wantedMime 사용
  const isInputPng = file.type === "image/png";
  const outMime = isInputPng ? "image/png" : wantedMime;

  // 디코딩 (createImageBitmap 우선, 실패 시 <img>)
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("createImageBitmap failed; fallback to Image()", err);
    }
  }

  let naturalW, naturalH, drawSource;
  if (bitmap) {
    naturalW = bitmap.width;
    naturalH = bitmap.height;
    drawSource = bitmap;
  } else {
    const img = await loadImageEl(file);
    naturalW = img.naturalWidth || img.width;
    naturalH = img.naturalHeight || img.height;
    drawSource = img;
  }

  const { width, height } = containSize(naturalW, naturalH, maxW, maxH);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: isInputPng }); // PNG만 알파 유지

  // JPEG/WebP로 저장할 때(비알파) 투명 배경이 있는 원본은 검정이 나올 수 있으니 흰 배경으로 채움
  if (!isInputPng) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(drawSource, 0, 0, width, height);

  // 최초 인코딩
  let q = quality;
  let blob = await canvasToBlob(canvas, outMime, q);

  // targetMaxBytes 지정 시 품질 점감 루프
  if (blob && targetMaxBytes && blob.size > targetMaxBytes) {
    while (q > minQuality) {
      q = Math.max(minQuality, +(q - 0.06).toFixed(2));
      const next = await canvasToBlob(canvas, outMime, q);
      if (!next) break;
      blob = next;
      if (blob.size <= targetMaxBytes) break;
      if (q <= minQuality) break;
    }
  }

  // 압축 실패/무의미(더 커짐) 시 원본 유지
  const outBlob =
    blob && blob.size > 0 && blob.size < file.size ? blob : file;

  // 확장자 계산: 실제 outBlob.type을 우선
  const chosenType =
    outBlob.type && outBlob.type !== "application/octet-stream"
      ? outBlob.type
      : outMime;
  const ext = chosenType.includes("png")
    ? "png"
    : chosenType.includes("webp")
    ? "webp"
    : "jpg";

  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([outBlob], `${base}.${ext}`, {
    type: chosenType,
    lastModified: Date.now(),
  });
}

/** 여러 개 한 번에 처리 */
export async function compressImages(files, opts) {
  const arr = Array.from(files || []);
  const out = [];
  for (const f of arr) {
    try {
      out.push(await compressImage(f, opts));
    } catch (e) {
      console.warn("[compressImages] fallback original:", f.name, e);
      out.push(f);
    }
  }
  return out;
}
