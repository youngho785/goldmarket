// src/pages/ProductDetail.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { fetchReviews } from "../services/reviewService";
import { addTransactionReview } from "../services/transactionReviewService";
import ProductReviewList from "../components/reviews/ProductReviewList";
import { useAuthContext } from "../context/AuthContext";
import { useNotificationContext } from "@/context/NotificationContext";
import { createOrGetChatRoom } from "../services/chatService";
import { checkPurchasePermission } from "../services/orderService";
import { fetchUserProfile } from "../services/userService";
import styled, { keyframes } from "styled-components";

/* ─────────── Layout: vertical premium cards ─────────── */
const Page = styled.div`
  max-width: 920px;
  margin: 28px auto 96px;
  padding: 0 16px;
`;

const TopBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(8px);
  background: ${({ theme }) => `${theme.colors.white}e6`};
  border-bottom: 1px solid rgba(0,0,0,0.06);
  padding: 10px 16px;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
`;

const TopBarTitle = styled.div`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 16px;
`;

const Card = styled.section`
  background: ${({ theme }) => theme.colors.white};
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.06);
`;

const CardBody = styled.div`
  padding: 20px;
`;

const Title = styled.h1`
  font-size: clamp(1.25rem, 2.6vw, 1.9rem);
  margin: 0;
  color: #161616;
  line-height: 1.28;
  letter-spacing: -0.01em;
`;

const SellerLine = styled.p`
  margin: 10px 0 0;
  color: #626262;
  font-size: 0.95rem;
`;

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.06);
  background: ${({ tone }) =>
    tone === "danger" ? "#fff1f0" :
    tone === "warning" ? "#fff7e6" :
    "#f5f7ff"};
  color: ${({ tone }) =>
    tone === "danger" ? "#d32029" :
    tone === "warning" ? "#ad6800" :
    "#3f51b5"};
`;

const PriceCard = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: end;
  gap: 12px;
  padding: 16px 18px;
  background: linear-gradient(180deg, #ffffff, #fafafa);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 12px;
  margin-top: 12px;
`;

const PriceLabel = styled.div`
  font-size: 0.92rem;
  color: #6b6b6b;
`;

const PriceValue = styled.div`
  font-size: clamp(1.10rem, 2.0vw, 1.2rem);
  font-weight: 900;
  color: #101010;
  letter-spacing: -0.02em;
`;

const SectionTitle = styled.h3`
  font-size: 1.05rem;
  margin: 0 0 10px;
  color: #151515;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px dashed rgba(0,0,0,0.08);
  margin: 16px 0;
`;

const InfoGrid = styled.dl`
  display: grid;
  grid-template-columns: 120px 1fr;
  row-gap: 10px;
  column-gap: 16px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }

  dt {
    color: #6b6b6b;
    font-size: 0.92rem;
  }
  dd {
    margin: 0;
    color: #1f1f1f;
    font-size: 0.98rem;
  }
`;

const Meta = styled.p`
  margin: 8px 0 0;
  color: #7a7a7a;
  font-size: 0.86rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: ${({ $variant, theme }) =>
    $variant === "primary" ? theme.colors.primary : "#fff"};
  color: ${({ $variant }) => ($variant === "primary" ? "#fff" : "#222")};
  cursor: pointer;
  font-weight: 700;
  transition: transform .06s ease, box-shadow .2s ease, background .2s ease;
  box-shadow: ${({ $variant }) =>
    $variant === "primary" ? "0 6px 16px rgba(38,94,233,0.24)" : "0 2px 8px rgba(0,0,0,0.06)"};

  &:hover:enabled { transform: translateY(-1px); }
  &:disabled { opacity: .6; cursor: not-allowed; }
`;

const GhostButton = styled(Button)`
  background: #fff;
`;

/* Gallery: main + thumbnails (vertical flow) */
const GalleryWrap = styled.div`
  padding: 12px;
`;

const MainImageBox = styled.div`
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4/3;
  overflow: hidden;
`;

const MainImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: zoom-in;
  user-select: none;
  -webkit-user-drag: none;
`;

const ThumbRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const Thumb = styled.img`
  width: 68px;
  height: 68px;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid ${({ active, theme }) => (active ? theme.colors.primary : "transparent")};
  background: #fff;
  cursor: pointer;
`;

/* Modal */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px 16px;
  z-index: 2000;
`;
const ModalContent = styled.div`
  position: relative;
  width: min(1100px, 96vw);
  max-height: 92vh;
  border-radius: 12px;
  overflow: hidden;
  background: transparent;
`;
const ModalImage = styled.img`
  display: block;
  width: 100%;
  height: auto;
  max-height: 92vh;
  object-fit: contain;
  cursor: zoom-out;
  user-select: none;
  -webkit-user-drag: none;
`;
const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0,0,0,0.55);
  border: none;
  color: #fff;
  font-size: 20px;
  line-height: 1;
  padding: 8px 10px;
  border-radius: 999px;
  cursor: pointer;
`;

/* Skeleton */
const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;
const Skeleton = styled.div`
  background: #f6f7f8;
  background-image: linear-gradient(90deg, #f6f7f8 0px, #edeef1 40px, #f6f7f8 80px);
  background-size: 600px;
  animation: ${shimmer} 1.2s infinite linear;
  border-radius: 10px;
`;

/* ─────────── Component ─────────── */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthContext();

  const notification = useNotificationContext();
  const notifySafe = useCallback(
    (message, type = "info") => {
      const fn =
        notification && typeof notification.notify === "function"
          ? notification.notify
          : null;
      if (fn) fn(message, type);
      else {
        if (type === "error") console.error(message);
        window.alert(message);
      }
    },
    [notification]
  );

  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const [startingChat, setStartingChat] = useState(false); // 더블 클릭 가드

  useEffect(() => {
    async function loadData() {
      try {
        const prodRef = doc(db, "products", id);
        const prodSnap = await getDoc(prodRef);
        if (!prodSnap.exists()) throw new Error("상품을 찾을 수 없습니다.");

        const prod = { id: prodSnap.id, ...prodSnap.data() };
        setProduct(prod);

        const [revsResult, sellerResult] = await Promise.allSettled([
          fetchReviews(id),
          prod.sellerId ? fetchUserProfile(prod.sellerId) : Promise.resolve(null),
        ]);

        setReviews(revsResult.status === "fulfilled" ? revsResult.value : []);
        setSeller(
          sellerResult.status === "fulfilled"
            ? sellerResult.value || null
            : null
        );
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    if (!user || !product) return;
    checkPurchasePermission(user.uid, product.id)
      .then(setCanReview)
      .catch(console.error);
  }, [user, product]);

  // 문서 타이틀(UX)
  useEffect(() => {
    if (!product?.title) return;
    const prev = document.title;
    document.title = `${product.title} | 상품 상세`;
    return () => { document.title = prev; };
  }, [product?.title]);

  // 상태 판별
  const isCompleted = !!product?.completed;
  const isSellerDeleted = product?.sellerDeleted === true;
  const isArchived = product?.status === "archived";
  const isSellerMissing = !seller; // 조회 실패/탈퇴 등
  const isBlocked = isSellerDeleted || isArchived || isSellerMissing;
  const isUnavailable = isCompleted || isBlocked;

  // 이미지 배열 폴백: imageUrls → images → photos
  const imageList = useMemo(() => {
    const list = product?.imageUrls ?? product?.images ?? product?.photos ?? [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }, [product]);

  // 무게(환산 X, 저장값 그대로 표시)
  const weightLine = useMemo(() => {
    const w = Number(product?.weight);
    if (!Number.isFinite(w)) return null;
    const unit = product?.weightUnit || "g";
    const pretty = unit === "돈" ? w.toFixed(2) : w.toFixed(3);
    return `${pretty} ${unit}`;
  }, [product]);

  const createdDate = useMemo(() => {
    const v = product?.createdAt;
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (v?.seconds) return new Date(v.seconds * 1000);
    if (v instanceof Date) return v;
    const parsed = Date.parse(v);
    return Number.isNaN(parsed) ? null : new Date(parsed);
  }, [product]);

  const formatPrice = (p) =>
    p != null ? `${Number(p).toLocaleString("ko-KR")}원` : "-";

  const handleImageClick = (url) => {
    setActiveImage(url);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setActiveImage("");
  };

  const handleStartChat = useCallback(async () => {
    if (isUnavailable) {
      notifySafe(
        isCompleted ? "이미 거래가 완료된 상품입니다." : "현재 이 상품은 거래가 불가능합니다.",
        "warning"
      );
      return;
    }
    if (!user) {
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    if (isAdmin) {
      notifySafe("관리자는 채팅을 생성할 수 없습니다.", "warning");
      return;
    }
    if (!product?.sellerId) {
      notifySafe("판매자 정보가 없습니다.", "error");
      return;
    }
    if (user.uid === product.sellerId) {
      notifySafe("내 상품에는 채팅할 수 없습니다.", "warning");
      return;
    }
    if (startingChat) return;
    setStartingChat(true);
    try {
      const roomId = await createOrGetChatRoom(
        product.id,
        product.sellerId,
        user.uid
      );
      if (typeof roomId !== "string" || !roomId) {
        throw new Error("채팅방 ID를 확인할 수 없습니다.");
      }
      navigate(`/chat/${roomId}`);
    } catch (err) {
      console.error("[handleStartChat] 실패:", err?.code || err?.message || err);
      notifySafe("채팅 시작에 실패했습니다.", "error");
    } finally {
      setStartingChat(false);
    }
  }, [user, isAdmin, product, id, navigate, notifySafe, isUnavailable, isCompleted, startingChat]);

  const handleMarkCompleted = useCallback(async () => {
    try {
      await updateDoc(doc(db, "products", id), {
        completed: true,
        completedAt: serverTimestamp(),
        archivedPrice: product?.price ?? null,
        price: null,
      });
      setProduct((p) => ({ ...p, completed: true, price: null }));
      notifySafe("거래가 완료 처리되었습니다.", "success");
    } catch (err) {
      console.error(err);
      notifySafe("거래 완료 처리에 실패했습니다.", "error");
    }
  }, [id, notifySafe, product?.price]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product?.title ?? "상품", url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      notifySafe("링크가 복사되었습니다.", "success");
    }
  };

  /* ─────────── Render ─────────── */
  if (loading) {
    return (
      <Page>
        <TopBar>
          <TopBarTitle>상품 불러오는 중…</TopBarTitle>
          <Skeleton style={{ width: 120, height: 40 }} />
        </TopBar>

        <Stack>
          <Card>
            <GalleryWrap>
              <Skeleton style={{ width: "100%", aspectRatio: "4/3", borderRadius: 12 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} style={{ width: 68, height: 68 }} />
                ))}
              </div>
            </GalleryWrap>
          </Card>

          <Card>
            <CardBody>
              <Skeleton style={{ width: "60%", height: 28 }} />
              <Skeleton style={{ width: "38%", height: 18, marginTop: 8 }} />
              <BadgeRow style={{ marginTop: 12 }}>
                <Skeleton style={{ width: 84, height: 28, borderRadius: 999 }} />
                <Skeleton style={{ width: 120, height: 28, borderRadius: 999 }} />
              </BadgeRow>
              <Divider />
              <Skeleton style={{ width: "100%", height: 18, marginTop: 6 }} />
              <Skeleton style={{ width: "100%", height: 18, marginTop: 6 }} />
              <Skeleton style={{ width: "60%", height: 18, marginTop: 6 }} />
              <Divider />
              <Skeleton style={{ width: "50%", height: 46, borderRadius: 12 }} />
            </CardBody>
          </Card>
        </Stack>
      </Page>
    );
  }

  if (error) return <Page>{error}</Page>;
  if (!product) return <Page>상품을 찾을 수 없습니다.</Page>;

  const priceNow = isCompleted ? product.archivedPrice : product.price;

  return (
    <Page>
      <TopBar>
        <TopBarTitle>{product.title}</TopBarTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <GhostButton onClick={() => navigate(-1)}>뒤로</GhostButton>
          <GhostButton onClick={handleShare}>공유</GhostButton>
        </div>
      </TopBar>

      <Stack>
        {/* 1) 갤러리 */}
        <Card aria-label="상품 이미지">
          <GalleryWrap>
            {imageList.length ? (
              <>
                <MainImageBox onClick={() => handleImageClick(imageList[activeIndex])}>
                  <MainImage
                    src={imageList[activeIndex]}
                    alt={`${product.title || "상품"} 메인 이미지`}
                    loading="eager"
                    decoding="async"
                  />
                </MainImageBox>
                {imageList.length > 1 && (
                  <ThumbRow aria-label="썸네일 목록">
                    {imageList.map((url, i) => (
                      <Thumb
                        key={url + i}
                        src={url}
                        alt={`썸네일 ${i + 1}`}
                        active={i === activeIndex}
                        onClick={() => setActiveIndex(i)}
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                  </ThumbRow>
                )}
              </>
            ) : (
              <CardBody>이미지가 없습니다.</CardBody>
            )}
          </GalleryWrap>
        </Card>

        {/* 2) 제목/판매자/배지/가격 */}
        <Card>
          <CardBody>
            <Title>{product.title}</Title>
            <SellerLine>
              판매자: <strong>{seller?.nickname || seller?.displayName || "알 수 없음"}</strong>
            </SellerLine>

            <BadgeRow>
              {isCompleted ? (
                <Badge tone="warning">거래완료</Badge>
              ) : isBlocked ? (
                <Badge tone="danger">거래불가</Badge>
              ) : (
                <Badge>판매중</Badge>
              )}
              {product.category && <Badge>{product.category}</Badge>}
              {createdDate && (
                <Badge title={createdDate?.toLocaleString("ko-KR")}>
                  등록 {formatDistanceToNow(createdDate, { addSuffix: true, locale: ko })}
                </Badge>
              )}
            </BadgeRow>

            <PriceCard role="note" aria-live="polite">
              <PriceLabel>{isCompleted ? "최종가" : "판매가"}</PriceLabel>
              <PriceValue>{formatPrice(priceNow)}</PriceValue>
            </PriceCard>
          </CardBody>
        </Card>

        {/* 3) 설명 */}
        <Card>
          <CardBody>
            <SectionTitle>상품 설명</SectionTitle>
            <p style={{ margin: 0, color: "#444", lineHeight: 1.65 }}>
              {product.description || "설명 없음"}
            </p>
          </CardBody>
        </Card>

        {/* 4) 정보 (판매자 ID 제거) */}
        <Card>
          <CardBody>
            <SectionTitle>상품 정보</SectionTitle>
            <InfoGrid>
              {product.category && (
                <>
                  <dt>카테고리</dt>
                  <dd>{product.category}</dd>
                </>
              )}
              {weightLine && (
                <>
                  <dt>무게</dt>
                  <dd>{weightLine}</dd>
                </>
              )}
              {/* 판매자 ID는 노출하지 않습니다. */}
            </InfoGrid>

            {createdDate && (
              <Meta title={createdDate?.toLocaleString("ko-KR")}>
                등록일: {formatDistanceToNow(createdDate, { addSuffix: true, locale: ko })}
              </Meta>
            )}
          </CardBody>
        </Card>

        {/* 5) 리뷰 */}
        {product.completed && (
          <Card>
            <CardBody>
              <SectionTitle>상품 리뷰</SectionTitle>
              <ProductReviewList reviews={reviews} />

              {user?.uid !== product.sellerId &&
                (canReview ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!form.comment.trim()) return;
                      setSubmitting(true);
                      try {
                        await addTransactionReview({
                          sellerId: product.sellerId,
                          buyerId: user.uid,
                          rating: form.rating,
                          comment: form.comment,
                          createdAt: new Date().toISOString(),
                        });
                        notifySafe("평가가 등록되었습니다.", "success");
                        const updated = await fetchReviews(id);
                        setReviews(updated);
                        setForm({ rating: 5, comment: "" });
                      } catch (err) {
                        console.error(err);
                        notifySafe("평가 등록에 실패했습니다.", "error");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    style={{ marginTop: 16 }}
                  >
                    <label style={{ fontWeight: 700, color: "#333" }}>평점</label>
                    <select
                      name="rating"
                      value={form.rating}
                      onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                      style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginTop: 6 }}
                    >
                      {[1, 2, 3, 4, 5].map((r) => (
                        <option key={r} value={r}>{r}점</option>
                      ))}
                    </select>

                    <label style={{ fontWeight: 700, color: "#333", marginTop: 12, display: "block" }}>코멘트</label>
                    <textarea
                      name="comment"
                      rows={4}
                      value={form.comment}
                      onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                      placeholder="코멘트를 입력하세요"
                      required
                      style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginTop: 6, resize: "vertical" }}
                    />

                    <Button type="submit" $variant="primary" disabled={submitting} style={{ marginTop: 12 }}>
                      {submitting ? "등록 중..." : "평가 제출"}
                    </Button>
                  </form>
                ) : (
                  <p style={{ color: "#666", marginTop: 6 }}>
                    구매 내역이 없어 평가할 수 없습니다.
                  </p>
                ))}
            </CardBody>
          </Card>
        )}

        {/* 6) 맨 아래: 액션 (채팅하기/거래 완료) */}
        <Card>
          <CardBody>
            <Actions>
              <Button
                $variant="primary"
                onClick={handleStartChat}
                disabled={!user || user.uid === product.sellerId || isUnavailable || startingChat}
                title={
                  isCompleted
                    ? "거래완료된 상품은 채팅이 비활성화됩니다."
                    : (isBlocked ? "거래불가 상태의 상품은 채팅이 비활성화됩니다." : undefined)
                }
              >
                {startingChat ? "채팅 시작 중..." : "채팅하기"}
              </Button>

              {user?.uid === product.sellerId && !product.completed && (
                <Button onClick={handleMarkCompleted}>거래 완료</Button>
              )}
            </Actions>
          </CardBody>
        </Card>
      </Stack>

      {/* Modal */}
      {modalOpen && (
        <ModalOverlay role="dialog" aria-modal="true" onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <CloseButton onClick={closeModal} aria-label="닫기">×</CloseButton>
            <ModalImage src={activeImage} alt="확대 보기" />
          </ModalContent>
        </ModalOverlay>
      )}
    </Page>
  );
}
