//src/components/products/ProductCard.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Heart, ThumbsUp } from "lucide-react";
import { useFavorites } from "../../context/FavoritesContext";
import { useAuthContext } from "../../context/AuthContext";
import { useNotificationContext } from "@/context/NotificationContext";
import {
  doc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";

/* ──────────────────────── Module-level cache ───────────────────────── */
const sellerNameCache = new Map(); // uid -> string

/* ── Styled ──────────────────────────────────────────────────────────────── */
const Card = styled.article`
  position: relative;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.08);
  overflow: hidden;
  transition: transform .15s ease, box-shadow .15s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 26px rgba(0,0,0,0.12);
  }

  @media (max-width: 600px) {
    flex-direction: row;
    height: auto;
  }
`;

const StyledLink = styled(Link)`
  display: flex;
  flex-direction: column;
  flex: 1;
  color: inherit;
  text-decoration: none;

  @media (max-width: 600px) {
    flex-direction: row;
  }
`;

const ThumbWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: 70%;
  background: linear-gradient(180deg, #f7f9fb 0%, #eef3f6 100%);

  @media (max-width: 600px) {
    width: 38%;
    padding-top: 0;
    aspect-ratio: 4 / 3;
    flex-shrink: 0;
  }
`;

const ThumbImg = styled.img`
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
`;

const Shimmer = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #f1f4f7 0%, #e7ecf1 40%, #f1f4f7 80%);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.18) 100%);
  pointer-events: none;
  z-index: 1;
`;

const StatusRibbon = styled.div`
  position: absolute;
  right: -42px; bottom: 12px;
  width: 160px; text-align: center;
  transform: rotate(-45deg);
  background: ${({ $variant }) => ($variant === "completed" ? "#f59e0b" : "#2b2f39")};
  color: #fff; font-size: 0.8rem; font-weight: 700;
  padding: 6px 0;
  box-shadow: 0 4px 14px rgba(0,0,0,0.2);
  opacity: ${p => (p.$show ? 1 : 0)};
  pointer-events: none;
  transition: opacity .2s ease;
  z-index: 4;
`;

const Info = styled.div`
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 600px) {
    flex: 1;
    padding: 10px;
    gap: 6px;
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Title = styled.h3`
  margin: 0;
  line-height: 1.25;
  font-size: 1rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  min-width: 0;
`;

const PillGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
`;

const PillBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid
    ${({ $variant, $active }) =>
      $variant === "heart"
        ? ($active ? "#f8bfd0" : "#f4d6de")
        : ($active ? "#f0d68a" : "#efe3a9")};
  background:
    ${({ $variant, $active }) =>
      $variant === "heart"
        ? ($active ? "#fde7ef" : "#fff5f8")
        : ($active ? "#fff7db" : "#fffbed")};
  color: #2b2f39;
  cursor: pointer;
  transition: transform .08s ease, background .12s ease, box-shadow .12s ease;

  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  &:active { transform: scale(0.98); }
  &:disabled { opacity: .6; cursor: not-allowed; }

  @media (max-width: 360px) {
    height: 26px;
    font-size: 0.78rem;
    padding: 0 8px;
  }
`;

const SellerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b5563;
  font-size: 0.88rem;
  font-weight: 700;
`;

const SellerLabel = styled.span`
  color: #6b7280;
  font-weight: 700;
`;

const Desc = styled.p`
  margin: 0;
  color: #5a5f66;
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Price = styled.p`
  margin: 0;
  font-size: 1.06rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`;

const Muted = styled.span`
  color: #8b9097;
  font-weight: 700;
`;

const Timestamp = styled.p`
  margin: 0;
  font-size: 0.78rem;
  color: #9aa0a6;
`;

function ProductCard({ product }) {
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();
  const { user } = useAuthContext();
  const { notify } = useNotificationContext() || { notify: () => {} };

  const [favorited, setFavorited] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isProcessingFavorite, setIsProcessingFavorite] = useState(false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);

  const [sellerName, setSellerName] = useState(
    product?.sellerName ||
      product?.sellerNickname ||
      product?.sellerDisplayName ||
      ""
  );

  const createdAtMs = useMemo(() => {
    const v = product?.createdAt;
    if (!v) return Date.now();
    if (typeof v?.toDate === "function") return v.toDate().getTime();
    if (v?.seconds) return v.seconds * 1000;
    if (typeof v === "number") return v;
    const parsed = Date.parse(v);
    return isNaN(parsed) ? Date.now() : parsed;
  }, [product?.createdAt]);

  const createdDate = useMemo(() => new Date(createdAtMs), [createdAtMs]);

  // Firestore 구독: 좋아요 상태/개수
  useEffect(() => {
    if (!product?.id) return;
    let unsub = () => {};
    try {
      const productRef = doc(db, "products", product.id);
      unsub = onSnapshot(
        productRef,
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() || {};
          const lc = Number(data.likesCount || 0);
          const lb = Array.isArray(data.likedBy) ? data.likedBy : [];
          setLikesCount(Math.max(0, lc));
          setLiked(user ? lb.includes(user.uid) : false);
        },
        (err) => {
          if (process.env.NODE_ENV === "development") {
            console.warn("[products] listen error:", err);
          }
        }
      );
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[products] listen start failed:", e);
      }
    }
    return () => unsub();
  }, [product?.id, user]);

  useEffect(() => {
    setFavorited(
      favorites.some(
        (f) => f.favoriteProductId === product?.id || f.id === product?.id
      )
    );
  }, [favorites, product?.id]);

  // 판매자명 조회: 공개 프로필(profiles/{uid})에서 읽기 + 캐시
  useEffect(() => {
    let mounted = true;
    const uid = product?.sellerId;
    if (!uid) {
      setSellerName((prev) => prev || "");
      return () => {
        mounted = false;
      };
    }

    if (sellerNameCache.has(uid)) {
      const cached = sellerNameCache.get(uid);
      if (mounted) setSellerName((prev) => prev || cached || "");
      return () => {
        mounted = false;
      };
    }

    const fallback =
      product?.sellerName ||
      product?.sellerNickname ||
      product?.sellerDisplayName ||
      "";
    if (fallback) {
      sellerNameCache.set(uid, fallback);
      if (mounted) setSellerName(fallback);
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, "profiles", uid));
        const data = snap.exists() ? snap.data() : null;
        const name = (data?.nickname || data?.displayName || "").trim();
        const finalName = name || "";
        sellerNameCache.set(uid, finalName);
        if (mounted) setSellerName(finalName);
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[profiles] read seller name failed:", e);
        }
        sellerNameCache.set(uid, "");
        if (mounted) setSellerName((prev) => prev || "");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    product?.sellerId,
    product?.sellerName,
    product?.sellerNickname,
    product?.sellerDisplayName,
  ]);

  const toggleFavorite = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        notify?.("로그인이 필요합니다.");
        return;
      }
      if (!product?.id) return;

      setIsProcessingFavorite(true);
      try {
        if (favorited) await removeFromFavorites(product.id);
        else await addToFavorites(product.id);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("찜하기 실패:", err);
        }
        notify?.(
          err?.code === "permission-denied"
            ? "찜 권한이 없습니다. Firestore 규칙을 확인하세요."
            : "찜 처리 중 오류가 발생했습니다."
        );
      } finally {
        setIsProcessingFavorite(false);
      }
    },
    [favorited, product?.id, user, addToFavorites, removeFromFavorites, notify]
  );

  const toggleLike = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        notify?.("로그인이 필요합니다.");
        return;
      }
      if (!product?.id) return;

      if (isProcessingLike) return; // 빠른 연속 클릭 가드
      setIsProcessingLike(true);
      const refDoc = doc(db, "products", product.id);

      try {
        if (liked) {
          await updateDoc(refDoc, {
            likedBy: arrayRemove(user.uid),
            likesCount: increment(-1),
          });
        } else {
          await updateDoc(refDoc, {
            likedBy: arrayUnion(user.uid),
            likesCount: increment(1),
          });
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("좋아요 실패:", err);
        }
        notify?.(
          err?.code === "permission-denied"
            ? "좋아요 권한이 없습니다. Firestore 규칙을 확인하세요."
            : "좋아요 처리 중 오류가 발생했습니다."
        );
      } finally {
        setIsProcessingLike(false);
      }
    },
    [liked, product?.id, user, notify, isProcessingLike]
  );

  if (!product) return null;

  // ── 상태 판별
  const isCompleted = !!product.completed;
  const isSellerDeleted = product.sellerDeleted === true;
  const isArchived = product.status === "archived";

  // 리스트 단계에서는 판매자 프로필 유무를 모를 수 있으니 명시 플래그만 사용
  const isUnavailableButNotCompleted = isSellerDeleted || isArchived;

  const ribbonText = isCompleted ? "거래완료" : (isUnavailableButNotCompleted ? "거래불가" : null);
  const ribbonVariant = isCompleted ? "completed" : "blocked";

  return (
    <Card aria-labelledby={`title-${product.id}`}>
      <StyledLink to={`/product/${product.id}`}>
        <ThumbWrapper>
          {!imgError && product.imageUrls?.[0] ? (
            <>
              {!imgLoaded && <Shimmer />}
              <ThumbImg
                src={product.imageUrls[0]}
                alt={product.title}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                loading="lazy"
                decoding="async"
              />
              <Overlay />
              <StatusRibbon $show={!!ribbonText} $variant={ribbonVariant}>
                {ribbonText}
              </StatusRibbon>
            </>
          ) : (
            <div style={{ position: "absolute", inset: 0 }}>
              <Shimmer />
            </div>
          )}
        </ThumbWrapper>

        <Info>
          <TitleRow>
            <Title id={`title-${product.id}`}>{product.title}</Title>

            <PillGroup>
              <PillBtn
                onClick={toggleFavorite}
                disabled={isProcessingFavorite}
                aria-pressed={favorited}
                aria-label={favorited ? "찜 취소" : "찜하기"}
                title={favorited ? "찜 취소" : "찜하기"}
                $variant="heart"
                $active={favorited}
              >
                <Heart size={16} fill={favorited ? "#ff4d6d" : "none"} color="#ff4d6d" />
                찜
              </PillBtn>

              <PillBtn
                onClick={toggleLike}
                disabled={isProcessingLike}
                aria-pressed={liked}
                aria-label={liked ? "좋아요 취소" : "좋아요"}
                title={liked ? "좋아요 취소" : "좋아요"}
                $variant="like"
                $active={liked}
              >
                <ThumbsUp size={16} fill={liked ? "#fbbf24" : "none"} color="#f59e0b" />
                좋아요 {Math.max(0, likesCount)}
              </PillBtn>
            </PillGroup>
          </TitleRow>

          {product.sellerId && (
            <SellerRow>
              <SellerLabel>판매자</SellerLabel>
              <span>{sellerName || "정보없음"}</span>
            </SellerRow>
          )}

          <Desc>{product.description}</Desc>

          {isCompleted ? (
            <Muted>거래완료</Muted>
          ) : isUnavailableButNotCompleted ? (
            <Muted>거래불가</Muted>
          ) : (
            <Price>
              {product.price != null
                ? `₩${Number(product.price).toLocaleString("ko-KR")}`
                : "가격 미정"}
            </Price>
          )}

          <Timestamp>
            {formatDistanceToNow(createdDate, { addSuffix: true, locale: ko })}
          </Timestamp>
        </Info>
      </StyledLink>
    </Card>
  );
}

export default React.memo(ProductCard);
