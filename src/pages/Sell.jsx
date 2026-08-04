// src/pages/Sell.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { addProduct, uploadProductImages } from "../services/productService";
import { useAuthContext } from "../context/AuthContext";
import { useNotificationContext } from "@/context/NotificationContext";
import styled from "styled-components";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { compressImage } from "../utils/imageCompression";
import { CATEGORY_OPTIONS } from "../constants/categories";

const PageContainer = styled.div`
  max-width: 800px;
  margin: 8px auto 32px;
  padding: clamp(22px, 4vw, 36px);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  border-radius: ${({ theme }) => theme.radii.large};
  position: relative;
`;

const Title = styled.h1`
  position: relative;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 26px;
  padding-bottom: 14px;
  &::after { content: ""; position: absolute; left: 0; bottom: 0; width: 50px; height: 3px; border-radius: 999px; background: ${({ theme }) => theme.gradients.gold}; }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
`;

const FormGroup = styled.div`
  margin-bottom: 18px;
  position: relative;
`;

const Label = styled.label`
  font-weight: 750;
  margin-bottom: 7px;
  color: ${({ theme }) => theme.colors.text};
  display: block;
`;

const Select = styled.select`
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  font-size: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
`;

const Input = styled.input`
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  font-size: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
`;

/* 입력 길이에 따라 자동으로 높이 증가 */
const TextArea = styled.textarea`
  width: 100%;
  padding: 11px 12px;
  font-size: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  line-height: 1.5;
  min-height: 96px;
  overflow: hidden;
  resize: none;
  white-space: pre-wrap;
`;

const Button = styled.button`
  min-height: 48px;
  padding: 12px 16px;
  font-size: 1rem;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.small};
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:enabled { filter: brightness(.96); }
  &:disabled { opacity: .55; cursor: not-allowed; }
`;

const ImagePreviewContainer = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const PreviewWrapper = styled.div`
  position: relative;
`;

const PreviewImage = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  min-height: 22px;
  background: ${({ theme }) => theme.colors.error};
  color: ${({ theme }) => theme.on.error};
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
  padding: 0;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorText = styled.p`
  color: ${({ theme }) => theme.semantic.alertErrorText};
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 10px;
  text-align: center;
`;

const InlineHelp = styled.small`
  display: block;
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default function Sell() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const notificationContext = useNotificationContext();
  const notifyUser = useCallback(
    (message) => {
      try {
        if (notificationContext) {
          if (typeof notificationContext === "function") return notificationContext(message);
          if (typeof notificationContext.notify === "function") return notificationContext.notify(message);
          if (typeof notificationContext.addNotification === "function")
            return notificationContext.addNotification(message);
          if (typeof notificationContext.add === "function") return notificationContext.add(message);
          if (typeof notificationContext.push === "function") return notificationContext.push(message);
        }
      } catch (err) {
        console.error("notify failed:", err);
      }
      if (typeof window !== "undefined" && window.alert) window.alert(message);
      else console.log(message);
    },
    [notificationContext]
  );

  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(""); // 표시용(콤마 포함) 문자열
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("g");
  // images: [{ file: File, url: string }]
  const [images, setImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const descRef = useRef(null);
  const urlsRef = useRef(new Set());
  const rafIdRef = useRef(null);
  const DON_TO_GRAMS = 3.75;

  // ===== 가격 콤마 유틸 =====
  const uncomma = (v) => String(v ?? "").replace(/[^\d]/g, "");
  const toComma = (digits) => {
    if (!digits) return "";
    const normalized = digits.replace(/^0+(?=\d)/, "");
    return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  useEffect(() => {
    if (!user) {
      notifyUser("상품 등록을 위해 로그인이 필요합니다.");
      navigate("/login");
    }
  }, [user, notifyUser, navigate]);

  // 언마운트 시 미리보기 URL 정리 + rAF 취소
  useEffect(() => {
    const previewUrls = urlsRef.current;
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      previewUrls.clear();
    };
  }, []);

  // 설명 autosize
  const autosize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    if (descRef.current) autosize(descRef.current);
  }, [description]);

  const conversionText = useMemo(() => {
    const n = parseFloat(String(weight));
    if (!Number.isFinite(n) || n <= 0) return "";
    if (weightUnit === "g") return `≈ ${(n / DON_TO_GRAMS).toFixed(2)} 돈`;
    return `≈ ${(n * DON_TO_GRAMS).toFixed(3)} g`;
  }, [weight, weightUnit]);

  if (!user) return null;

  const MAX_IMAGES = 4;
  const MAX_SIZE_MB = 15;
  const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png"];
  const MAX_DESC_LEN = 500;

  const id = {
    category: "sell-category",
    title: "sell-title",
    description: "sell-description",
    price: "sell-price",
    weight: "sell-weight",
    weightUnit: "sell-weight-unit",
    images: "sell-images",
  };

  // 이미지 선택 + 클라이언트 압축(가벼운 1차)
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remain = Math.max(0, MAX_IMAGES - images.length);
    const picked = files.slice(0, remain);

    const next = [];
    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        notifyUser(`${file.name} 형식이 지원되지 않습니다.`);
        continue;
      }

      let work = file;
      const needCompress = file.size > 1 * 1024 * 1024;
      if (needCompress) {
        try {
          work = await compressImage(file, {
            maxW: 2048,
            maxH: 2048,
            quality: 0.82,
            preferMime: "image/jpeg",
          });
        } catch (err) {
          console.warn("압축 실패, 원본 사용:", err);
        }
      }

      if (work.size > MAX_SIZE) {
        notifyUser(`${file.name} 압축 후에도 ${MAX_SIZE_MB}MB를 초과합니다.`);
        continue;
      }

      const url = URL.createObjectURL(work);
      urlsRef.current.add(url);
      next.push({ file: work, url });
    }
    if (next.length) setImages((prev) => [...prev, ...next]);
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const target = prev[idx];
      if (target?.url) {
        URL.revokeObjectURL(target.url);
        urlsRef.current.delete(target.url);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (submitting) return; // 중복 제출 가드

    const titleTrim = title.trim();
    const descTrim = description.trim();

    if (!category || !titleTrim || !descTrim || !price || !weight) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    const priceNum = parseInt(uncomma(String(price)), 10);
    const weightNum = parseFloat(String(weight));

    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("가격은 0 이상의 정수로 입력해주세요.");
      return;
    }
    if (Number.isNaN(weightNum) || weightNum <= 0) {
      setError("무게는 0보다 큰 숫자로 입력해주세요.");
      return;
    }
    if (images.length === 0) {
      setError("상품 이미지를 최소 1장 업로드해주세요.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      // 이미지 업로드(순서 보존, 실패 시 자동 롤백)
      const imageUrls = await uploadProductImages(
        images.map((it) => it.file),
        {
          ownerUid: user.uid,
          // 여기서도 2차 압축 파라미터 적용 가능(선호 MIME/webp 등)
          maxW: 1600,
          maxH: 1600,
          targetMaxBytes: 1_200_000,
          quality: 0.88,
          preferMime: "image/webp",
          onProgress: (p) => {
            // 너무 잦은 setState 방지
            if (rafIdRef.current) return;
            rafIdRef.current = requestAnimationFrame(() => {
              setUploadProgress(p);
              rafIdRef.current = null;
            });
          },
        }
      );

      const weightGramsRaw = weightUnit === "돈" ? weightNum * DON_TO_GRAMS : weightNum;
      const weightGrams = Number(weightGramsRaw.toFixed(3));

      // createdAt/updatedAt 은 서비스 레이어에서만 세팅
      const product = {
        title: titleTrim,
        description: descTrim,
        price: priceNum,
        category,
        imageUrls, // 순서 보존
        sellerId: user.uid,
        weight: weightNum,
        weightUnit,
        weightGrams,
        approved: true,
        completed: false,
        moderationStatus: "approved",
      };

      const productRef = await addProduct(product);
      notifyUser("상품이 등록되어 프리마켓에 바로 공개되었습니다.");
      navigate(`/product/${productRef.id}`);
    } catch (err) {
      console.error(err);
      const msg = (err && (err.message || err.code)) || "알 수 없는 오류";
      setError(`등록 중 오류: ${msg}`);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    }
  };

  return (
    <PageContainer>
      {submitting && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255,255,255,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "all",
          }}
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingSpinner />
        </div>
      )}

      <Title>상품 등록</Title>
      {error && <ErrorText role="alert">{error}</ErrorText>}

      <Form onSubmit={handleSubmit} $disabled={submitting} aria-disabled={submitting}>
        <FormGroup>
          <Label htmlFor={id.category}>카테고리</Label>
          <Select
            id={id.category}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            disabled={submitting}
          >
            <option value="">선택하세요</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor={id.title}>상품명</Label>
          <Input
            id={id.title}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
            disabled={submitting}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor={id.description}>
            상품 설명 (<span aria-live="polite">{description.length}</span>/{MAX_DESC_LEN})
          </Label>
          <TextArea
            id={id.description}
            ref={descRef}
            value={description}
            onChange={(e) => {
              const v = e.target.value;
              if (v.length <= MAX_DESC_LEN) {
                setDescription(v);
                autosize(e.target);
              }
            }}
            placeholder="상품 설명을 자유롭게 입력하세요. 엔터로 줄바꿈하면 칸이 자동으로 늘어납니다."
            required
            disabled={submitting}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor={id.price}>가격 (원)</Label>
          <Input
            id={id.price}
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => {
              const raw = uncomma(e.target.value);
              setPrice(toComma(raw));
            }}
            onKeyDown={(e) => {
              const blocked = ["e", "E", "+", "-", "."];
              if (blocked.includes(e.key)) e.preventDefault();
            }}
            placeholder="예: 1,200,000"
            required
            disabled={submitting}
          />
          <InlineHelp>입력 시 자동으로 , 가 표시됩니다.</InlineHelp>
        </FormGroup>

        <FormGroup>
          <Label htmlFor={id.weight}>무게</Label>
          <div style={{ display: "flex", gap: "10px" }}>
            <Input
              id={id.weight}
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min="0"
              step={weightUnit === "돈" ? "0.01" : "0.1"}
              required
              disabled={submitting}
              aria-describedby="weight-conversion"
            />
            <Select
              id={id.weightUnit}
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value)}
              disabled={submitting}
            >
              <option value="g">g</option>
              <option value="돈">돈</option>
            </Select>
          </div>
          <InlineHelp>* 1돈 = 3.75g, 저장 시 g 기준 값도 함께 저장됩니다.</InlineHelp>
          {/* 환산 표시 (실시간) */}
          {conversionText && (
            <InlineHelp id="weight-conversion" aria-live="polite">
              {conversionText}
            </InlineHelp>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor={id.images}>상품 이미지 (최대 {MAX_IMAGES}장, 파일당 최대 {MAX_SIZE_MB}MB)</Label>
          <Input
            id={id.images}
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={handleImageChange}
            disabled={submitting || images.length >= MAX_IMAGES}
          />
        </FormGroup>

        {images.length > 0 && (
          <ImagePreviewContainer>
            {images.map((it, idx) => (
              <PreviewWrapper key={it.url}>
                <PreviewImage src={it.url} alt={`상품 이미지 미리보기 ${idx + 1}`} />
                <RemoveBtn
                  type="button"
                  onClick={() => removeImage(idx)}
                  aria-label={`이미지 ${idx + 1} 삭제`}
                  disabled={submitting}
                  title={submitting ? "등록 중에는 삭제할 수 없습니다." : "이미지 삭제"}
                >
                  ×
                </RemoveBtn>
              </PreviewWrapper>
            ))}
          </ImagePreviewContainer>
        )}

        {submitting && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(uploadProgress)}
            style={{ textAlign: "center", marginTop: 10 }}
            aria-live="polite"
          >
            업로드 중: {Math.round(uploadProgress)}%
          </div>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "등록 중..." : "상품 등록"}
        </Button>
      </Form>
    </PageContainer>
  );
}
