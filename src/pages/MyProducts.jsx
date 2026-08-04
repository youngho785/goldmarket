// src/pages/MyProducts.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  ref,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../firebase/firebase";
import { useAuthContext } from "../context/AuthContext";
import styled from "styled-components";
import { formatDistanceToNow, isValid } from "date-fns";
import { ko } from "date-fns/locale";
import { CATEGORY_OPTIONS } from "../constants/categories";
import { serverTimestamp } from "firebase/firestore";
import { compressImage } from "../utils/imageCompression";
import { uploadProductImages } from "../services/productService";

/* ── 스타일 ─────────────────────────────────── */
const Container = styled.div`
  padding: 8px 0 32px;
  max-width: 980px;
  margin: 0 auto;
`;

const ProductItem = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: clamp(18px, 3vw, 24px);
  margin-bottom: 18px;
  border-radius: ${({ theme }) => theme.radii.large};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  &:hover { transform: translateY(-1px); box-shadow: ${({ theme }) => theme.shadows.hover}; border-color: ${({ theme }) => theme.colors.borderStrong}; }
`;

const Section = styled.section`
  & + & { margin-top: 14px; padding-top: 14px; border-top: 1px dashed ${({ theme }) => theme.colors.border}; }
`;
const SectionTitle = styled.h3`
  margin: 0 0 8px; font-size: 0.95rem; color: ${({ theme }) => theme.colors.text}; font-weight: 800; letter-spacing: -0.01em;
`;
const InfoGrid = styled.dl`
  display: grid; grid-template-columns: 110px 1fr; row-gap: 8px; column-gap: 12px; margin: 0;
`;
const DT = styled.dt` color: ${({ theme }) => theme.colors.textSecondary}; font-weight: 700; `;
const DD = styled.dd` margin: 0; color: ${({ theme }) => theme.colors.text}; `;

const ButtonGroup = styled.div` margin-top: 15px; display: flex; gap: 10px; `;
const Button = styled.button`
  min-height: 44px; padding: 10px 16px; border: 1px solid ${p => p.theme.colors.border}; border-radius: ${p => p.theme.radii.small}; font-weight: 750; cursor: pointer;
  color: ${p => p.$variant === "cancel" ? p.theme.colors.text : p.theme.on.primary};
  background: ${p =>
    p.$variant === "delete" ? p.theme.colors.error :
    p.$variant === "cancel" ? p.theme.colors.surfaceAlt : p.theme.gradients.primary};
  &:hover { opacity: .95; }
`;

const Input = styled.input`
  padding: 10px 12px; margin: 8px 0; width: 100%; box-sizing: border-box; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.small};
`;
const Textarea = styled.textarea`
  padding: 10px; margin: 8px 0; width: 100%; min-height: 96px; box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.small}; line-height: 1.5; white-space: pre-wrap; overflow: hidden; resize: none;
`;
const Select = styled.select`
  padding: 10px 12px; margin: 8px 0; width: 100%; box-sizing: border-box; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.small};
`;

const ImageContainer = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px; margin-top: 10px; max-width: 420px;
`;
const ImageWrap = styled.div`
  position: relative; width: 100%; aspect-ratio: 1/1; border-radius: 12px; overflow: hidden; border: 1px solid ${({ theme }) => theme.colors.border};
`;
const ProductImage = styled.img`
  width: 100%; height: 100%; object-fit: cover;
`;
const RoundXButton = styled.button`
  position: absolute; top: 4px; right: 4px; width: 26px; height: 26px; min-height: 26px; border-radius: 9999px;
  border: 1px solid rgba(255,255,255,.9); background: rgba(0,0,0,.55); cursor: pointer; padding: 0;
  &::before, &::after { content: ""; position: absolute; width: 12px; height: 2px; background: #fff; border-radius: 2px; left: 50%; top: 50%; transform-origin: center; }
  &::before { transform: translate(-50%, -50%) rotate(45deg); }
  &::after  { transform: translate(-50%, -50%) rotate(-45deg); }
  &:hover { background: rgba(0,0,0,.7); }
`;

const DescBox = styled.div`
  background: ${({ theme }) => theme.colors.surfaceAlt}; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px; padding: 11px 13px;
`;
const DescView = styled.p` white-space: pre-wrap; line-height: 1.7; margin: 0; color: ${({ theme }) => theme.colors.text}; `;
const DescPreview = styled(DescView)`
  display: -webkit-box; -webkit-line-clamp: ${p => p.$lines || 2}; -webkit-box-orient: vertical;
  overflow: hidden; word-break: break-word;
`;
const MoreLess = styled.button`
  min-height: auto; margin-top: 6px; background: none; border: 0; color: ${({ theme }) => theme.colors.link}; font-weight: 700; cursor: pointer; padding: 0; box-shadow: none;
  &:hover { background: transparent; transform: none; box-shadow: none; text-decoration: underline; }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 800;
  background: ${({ $tone, theme }) =>
    $tone === "success" ? theme.semantic.alertSuccessBg :
    $tone === "error" ? theme.semantic.alertErrorBg :
    $tone === "warning" ? theme.semantic.alertWarningBg :
    theme.semantic.alertInfoBg};
  color: ${({ $tone, theme }) =>
    $tone === "success" ? theme.semantic.alertSuccessText :
    $tone === "error" ? theme.semantic.alertErrorText :
    $tone === "warning" ? theme.semantic.alertWarningText :
    theme.semantic.alertInfoText};
`;

/* ── 유틸 ─────────────────────────────────── */
const toJSDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  if (v?.seconds) return new Date(v.seconds * 1000);
  return null;
};
const toMillis = (ts) =>
  ts?.toDate ? ts.toDate().getTime() : ts?.seconds ? ts.seconds * 1000 : 0;

const getProductStatus = (product) => {
  if (product.completed) return { label: "거래 완료", tone: "info" };
  if (product.approved === true) return { label: "판매 중", tone: "success" };
  return { label: "관리자 공개 중지", tone: "error" };
};

/* 제한/압축 설정 */
const MAX_IMAGES = 20;
const MAX_SIZE_MB = 15;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const DON_TO_GRAMS = 3.75;

/* ── 컴포넌트 ─────────────────────────────── */
export default function MyProducts() {
  const { user } = useAuthContext();
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [localPreviews, setLocalPreviews] = useState([]);
  const [removedExisting, setRemovedExisting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState({});

  const toggleDesc = (id) =>
    setExpandedDesc((prev) => ({ ...prev, [id]: !prev[id] }));

  const prevUrlsRef = useRef([]);
  const revokeLocalPreviews = () => {
    prevUrlsRef.current.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch { /* noop */ }
    });
    prevUrlsRef.current = [];
  };
  useEffect(() => () => revokeLocalPreviews(), []);

  useEffect(() => {
    if (!user?.uid) return;
    const qy = query(
      collection(db, "products"),
      where("sellerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setProducts(rows);
      },
      (err) => console.error("제품 구독 오류:", err)
    );
    return () => unsub();
  }, [user?.uid]);

  // ✅ 상품 + 스토리지 이미지 함께 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      // 문서에서 이미지 URL 가져오기
      const snap = await getDoc(doc(db, "products", id));
      const data = snap.exists() ? snap.data() : null;
      const urls = Array.isArray(data?.imageUrls) ? data.imageUrls : [];

      // 문서 삭제
      await deleteDoc(doc(db, "products", id));

      // 스토리지 파일 삭제 (실패는 경고만 출력)
      await Promise.allSettled(
        urls.map(async (url) => {
          try {
            // refFromURL 대신 ref(storage, url) — https/gs url 모두 지원
            const sref = ref(storage, url);
            await deleteObject(sref);
          } catch (e) {
            console.warn("이미지 삭제 실패:", e);
          }
        })
      );

      alert("삭제되었습니다.");
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
    }
  };

  const handleEditClick = (product) => {
    setEditingId(product.id);
    setEditValues(product);
    setImageFiles([]);
    setLocalPreviews([]);
    setRemovedExisting([]);
    revokeLocalPreviews();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
    setImageFiles([]);
    setLocalPreviews([]);
    setRemovedExisting([]);
    revokeLocalPreviews();
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const currentCount = (editValues.imageUrls?.length || 0) + localPreviews.length;
    const remain = Math.max(0, MAX_IMAGES - currentCount);
    const picked = files.slice(0, remain);

    const nextFiles = [];
    const nextUrls = [];

    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name} 형식이 지원되지 않습니다.`);
        continue;
      }
      let work = file;
      if (file.size > 1 * 1024 * 1024) {
        try {
          work = await compressImage(file, { maxW: 2048, maxH: 2048, quality: 0.82, preferMime: "image/jpeg" });
        } catch (err) {
          console.warn("압축 실패, 원본 사용:", err);
        }
      }
      if (work.size > MAX_SIZE) {
        alert(`${file.name} 압축 후에도 ${MAX_SIZE_MB}MB를 초과합니다.`);
        continue;
      }
      const url = URL.createObjectURL(work);
      nextFiles.push(work);
      nextUrls.push(url);
    }

    if (nextFiles.length) {
      setImageFiles((prev) => [...prev, ...nextFiles]);
      setLocalPreviews((prev) => [...prev, ...nextUrls]);
      prevUrlsRef.current = [...prevUrlsRef.current, ...nextUrls];
    }
    e.target.value = "";
  };

  const handleRemoveExistingUrl = (url) => {
    setEditValues((prev) => ({
      ...prev,
      imageUrls: (prev.imageUrls || []).filter((u) => u !== url),
    }));
    setRemovedExisting((prev) => [...prev, url]);
  };

  const handleRemoveLocalPreview = (idx) => {
    const url = localPreviews[idx];
    try { URL.revokeObjectURL(url); } catch { /* noop */ }
    setLocalPreviews((prev) => prev.filter((_, i) => i !== idx));
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const descRef = useRef(null);
  const autosize = (el) => { if (!el) return; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; };
  useEffect(() => { if (editingId && descRef.current) autosize(descRef.current); }, [editingId, editValues.description]);

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      const productRef = doc(db, "products", editingId);
      const updates = { ...editValues };
      delete updates.id;
      delete updates.createdAt;
      updates.title = String(updates.title || "").trim();
      updates.description = String(updates.description || "").trim();
      updates.price = Number(updates.price);
      updates.weight = Number(updates.weight);
      updates.weightUnit = updates.weightUnit === "돈" ? "돈" : "g";

      if (!updates.title || updates.title.length > 100) {
        alert("상품명은 1자 이상 100자 이하로 입력해 주세요.");
        setLoading(false);
        return;
      }
      if (!updates.description || updates.description.length > 500) {
        alert("상품 설명은 1자 이상 500자 이하로 입력해 주세요.");
        setLoading(false);
        return;
      }
      if (!Number.isFinite(updates.price) || updates.price < 0) {
        alert("가격은 0 이상의 숫자로 입력해 주세요.");
        setLoading(false);
        return;
      }
      if (!Number.isFinite(updates.weight) || updates.weight <= 0) {
        alert("무게는 0보다 큰 숫자로 입력해 주세요.");
        setLoading(false);
        return;
      }
      if ((updates.imageUrls || []).length + imageFiles.length === 0) {
        alert("상품 이미지를 최소 1장 남겨 주세요.");
        setLoading(false);
        return;
      }

      const weightGramsRaw = updates.weightUnit === "돈"
        ? updates.weight * DON_TO_GRAMS
        : updates.weight;
      updates.weightGrams = Number(weightGramsRaw.toFixed(3));

      // ▶ 업로드는 공통 서비스 사용(압축+레주머블+롤백)
      let newUrls = [];
      if (imageFiles.length > 0) {
        newUrls = await uploadProductImages(imageFiles, {
          ownerUid: user?.uid,
          maxW: 2048,
          maxH: 2048,
          targetMaxBytes: 1_200_000,
          quality: 0.85,
          preferMime: "image/jpeg",
        });
      }

      updates.imageUrls = [...(updates.imageUrls || []), ...newUrls];
      updates.updatedAt = serverTimestamp();
      await updateDoc(productRef, updates);

      // 기존 이미지 중 제거 표시된 것 삭제
      await Promise.allSettled(
        (removedExisting || []).map(async (url) => {
          try {
            await deleteObject(ref(storage, url)); // https/gs url 모두 처리
          } catch (e) {
            console.warn("이미지 삭제 실패:", e);
          }
        })
      );

      alert(updates.approved === false
        ? "수정되었습니다. 관리자에 의해 공개 중지된 상태는 유지됩니다."
        : "수정되었습니다.");
      handleCancelEdit();
    } catch (err) {
      console.error(err);
      alert("수정 실패: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => setEditValues((prev) => ({ ...prev, [field]: value }));

  return (
    <Container>
      <h1 style={{ margin: "0 0 12px" }}>내 상품 관리</h1>

      {products.length === 0 ? (
        <p>등록된 상품이 없습니다.</p>
      ) : (
        products.map((prod) => {
          const createdDate = toJSDate(prod.createdAt);
          const createdLabel =
            createdDate && isValid(createdDate)
              ? formatDistanceToNow(createdDate, { addSuffix: true, locale: ko })
              : "";

          const isEditing = editingId === prod.id;
          const status = getProductStatus(prod);

          return (
            <ProductItem key={prod.id}>
              {isEditing ? (
                <>
                  <Section>
                    <SectionTitle>기본 정보</SectionTitle>
                    <label>상품명</label>
                    <Input
                      type="text"
                      value={editValues.title || ""}
                      maxLength={100}
                      onChange={(e) => handleChange("title", e.target.value)}
                    />

                    <label>설명</label>
                    <Textarea
                      ref={descRef}
                      value={editValues.description || ""}
                      maxLength={500}
                      onChange={(e) => {
                        handleChange("description", e.target.value);
                        if (descRef.current) autosize(descRef.current);
                      }}
                      placeholder="엔터로 줄바꿈하면 칸이 자동으로 늘어나요."
                    />

                    <InfoGrid>
                      <DT>가격(원)</DT>
                      <DD>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={editValues.price ?? ""}
                          onChange={(e) => handleChange("price", e.target.value)}
                        />
                      </DD>

                      <DT>카테고리</DT>
                      <DD>
                        <Select
                          value={editValues.category || ""}
                          onChange={(e) => handleChange("category", e.target.value)}
                        >
                          <option value="">카테고리 선택</option>
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </Select>
                      </DD>

                      <DT>무게</DT>
                      <DD>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min="0.01"
                            step="0.01"
                            value={editValues.weight ?? ""}
                            onChange={(e) => handleChange("weight", e.target.value)}
                            style={{ maxWidth: 160 }}
                          />
                          <Select
                            value={editValues.weightUnit || "g"}
                            onChange={(e) => handleChange("weightUnit", e.target.value)}
                            style={{ maxWidth: 100 }}
                          >
                            <option value="g">g</option>
                            <option value="돈">돈</option>
                          </Select>
                        </div>
                      </DD>
                    </InfoGrid>
                  </Section>

                  <Section>
                    <SectionTitle>이미지</SectionTitle>
                    <Input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png"
                      onChange={handleImageChange}
                      aria-label="상품 이미지 추가"
                    />
                    <ImageContainer>
                      {(editValues.imageUrls || []).map((src, idx) => (
                        <ImageWrap key={`old-${idx}`}>
                          <ProductImage src={src} alt={`기존 이미지 ${idx + 1}`} />
                          <RoundXButton
                            aria-label="이미지 삭제"
                            title="이미지 삭제"
                            onClick={() => handleRemoveExistingUrl(src)}
                          />
                        </ImageWrap>
                      ))}
                      {localPreviews.map((src, idx) => (
                        <ImageWrap key={`new-${idx}`}>
                          <ProductImage src={src} alt={`새 미리보기 ${idx + 1}`} />
                          <RoundXButton
                            aria-label="미리보기 제거"
                            title="미리보기 제거"
                            onClick={() => handleRemoveLocalPreview(idx)}
                          />
                        </ImageWrap>
                      ))}
                    </ImageContainer>
                  </Section>

                  <Section>
                    <InfoGrid>
                      <DT>등록일</DT>
                      <DD>{createdLabel}</DD>
                    </InfoGrid>

                    <ButtonGroup>
                      <Button $variant="cancel" onClick={handleCancelEdit} disabled={loading}>취소</Button>
                      <Button $variant="save" onClick={handleSaveEdit} disabled={loading}>
                        {loading ? "저장 중..." : "저장"}
                      </Button>
                    </ButtonGroup>
                  </Section>
                </>
              ) : (
                <>
                  <Section>
                    <SectionTitle>요약</SectionTitle>
                    <InfoGrid>
                      <DT>상품명</DT><DD>{prod.title}</DD>
                      <DT>가격</DT><DD>{Number((prod.completed ? prod.archivedPrice : prod.price) || 0).toLocaleString()} 원</DD>
                      <DT>카테고리</DT><DD>{prod.category}</DD>
                      <DT>무게</DT><DD>{prod.weight} {prod.weightUnit}</DD>
                      <DT>상태</DT><DD><StatusBadge $tone={status.tone}>{status.label}</StatusBadge></DD>
                      <DT>등록일</DT><DD>{createdLabel}</DD>
                    </InfoGrid>
                  </Section>

                  <Section>
                    <SectionTitle>설명</SectionTitle>
                    <DescBox>
                      {expandedDesc[prod.id] ? (
                        <>
                          <DescView>{prod.description || ""}</DescView>
                          <MoreLess onClick={() => toggleDesc(prod.id)}>접기</MoreLess>
                        </>
                      ) : (
                        <>
                          <DescPreview $lines={2}>{prod.description || ""}</DescPreview>
                          {(prod.description || "").length > 60 && (
                            <MoreLess onClick={() => toggleDesc(prod.id)}>더보기</MoreLess>
                          )}
                        </>
                      )}
                    </DescBox>
                  </Section>

                  <Section>
                    <SectionTitle>이미지</SectionTitle>
                    {prod.imageUrls?.length > 0 ? (
                      <ImageContainer>
                        {prod.imageUrls.map((url, idx) => (
                          <ImageWrap key={idx}>
                            <ProductImage src={url} alt={`상품 이미지 ${idx + 1}`} />
                          </ImageWrap>
                        ))}
                      </ImageContainer>
                    ) : (
                      <span style={{ color: "#6b7280" }}>등록된 이미지가 없습니다.</span>
                    )}
                  </Section>

                  <Section>
                    <ButtonGroup>
                      {!prod.completed && (
                        <Button $variant="save" onClick={() => handleEditClick(prod)}>수정</Button>
                      )}
                      <Button $variant="delete" onClick={() => handleDelete(prod.id)}>삭제</Button>
                    </ButtonGroup>
                  </Section>
                </>
              )}
            </ProductItem>
          );
        })
      )}
    </Container>
  );
}
