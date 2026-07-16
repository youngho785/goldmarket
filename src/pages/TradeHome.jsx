// src/pages/TradeHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { fetchProducts } from "../services/productService";
import ProductCard from "../components/products/ProductCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import MobileCardGrid from "../components/common/MobileCardGrid";

// ===== Styled Components =====
const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  ${({ "aria-busy": busy }) => busy && `opacity: 0.6;`}
`;

const LoadingContainer = styled(Wrapper)`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
`;

const SoftNote = styled.div`
  text-align: center;
  color: #444;
  background: #f6f7fb;
  border: 1px solid #e6e8ee;
  padding: 10px 12px;
  border-radius: 8px;
  margin: 12px 0;
  font-size: .95rem;
`;

const Header = styled.h1`
  text-align: center;
  margin-bottom: 24px;
  color: ${({ theme }) => theme.colors.primary};
`;

const ResultCount = styled.p`
  text-align: right;
  margin-bottom: 8px;
  color: #666;
`;

const SortBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  flex-direction: column;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 4px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 4px;
`;

const Button = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.secondary}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const GhostBtn = styled(Button)`
  background: #6c757d;
`;

const ResetButton = styled(Button)`
  background: #6c757d;
`;

// 모바일 전용 필터 토글 버튼
const ToggleButton = styled.button`
  display: none;
  @media (max-width: 768px) {
    display: block;
    margin: 0 auto 12px;
    background: ${({ theme }) => theme.colors.primary};
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
`;

// 페이지네이션
const Pagination = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 24px 0;
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  padding: 6px 10px;
  border: none;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : "#eee")};
  color: ${({ $active }) => ($active ? "#fff" : "#333")};
  border-radius: 4px;
  cursor: pointer;
  &:hover { ${({ $active }) => !$active && "background: #ddd;"} }
`;

// ===== 상수 =====
const sortOptions = [
  { value: "newest",   label: "최신순" },
  { value: "priceAsc", label: "가격 ↑" },
  { value: "priceDesc",label: "가격 ↓" },
  { value: "distance", label: "거리 순" }
];

const PAGE_SIZE = 12;

// ===== 유틸 =====
function toMillis(createdAt) {
  if (createdAt?.toMillis) return createdAt.toMillis();
  if (createdAt instanceof Date) return createdAt.getTime();
  const n = Number(createdAt);
  if (!Number.isNaN(n) && n > 0) return n;
  const t = new Date(createdAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// 하버사인
function getDistance(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== "number" || typeof lon1 !== "number" ||
    typeof lat2 !== "number" || typeof lon2 !== "number"
  ) return Infinity;

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// mq 훅
function useMediaQuery(query) {
  const [matches, setMatches] =
    useState(() => (typeof window === "undefined" ? true : window.matchMedia(query).matches));
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const listener = (e) => setMatches(e.matches);
    mq.addEventListener ? mq.addEventListener("change", listener) : mq.addListener(listener);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", listener) : mq.removeListener(listener);
    };
  }, [query]);
  return matches;
}

// 필터링 & 정렬 (디바운스 300ms) — 카테고리 관련 로직 제거됨
function useFilteredProducts(
  products,
  { searchTerm, maxPrice, maxDistance, userLocation, sortOption }
) {
  const [filtered, setFiltered] = useState(products);

  useEffect(() => {
    const handle = setTimeout(() => {
      let result = [...products];

      const term = searchTerm.trim().toLowerCase();
      if (term) {
        result = result.filter(p => p.title?.toLowerCase().includes(term));
      }

      if (maxPrice) {
        const num = parseFloat(maxPrice);
        if (!isNaN(num)) result = result.filter(p => p.price <= num);
      }

      // 거리 필터 (위치가 있을 때만 작동)
      if (userLocation && maxDistance) {
        const lim = parseFloat(maxDistance);
        if (!isNaN(lim)) {
          result = result.filter(p => {
            const d = getDistance(
              userLocation.latitude,
              userLocation.longitude,
              p.location?.latitude,
              p.location?.longitude
            );
            return d <= lim;
          });
        }
      }

      // 정렬
      switch (sortOption) {
        case "priceAsc":
          result.sort((a, b) => a.price - b.price);
          break;
        case "priceDesc":
          result.sort((a, b) => b.price - a.price);
          break;
        case "distance":
          if (userLocation) {
            result.sort((a, b) => {
              const da = getDistance(
                userLocation.latitude,
                userLocation.longitude,
                a.location?.latitude,
                a.location?.longitude
              );
              const db = getDistance(
                userLocation.latitude,
                userLocation.longitude,
                b.location?.latitude,
                b.location?.longitude
              );
              return da - db;
            });
          }
          break;
        case "newest":
        default:
          result.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      }

      setFiltered(result);
    }, 300);

    return () => clearTimeout(handle);
  }, [products, searchTerm, maxPrice, maxDistance, userLocation, sortOption]);

  return filtered;
}

export default function TradeHome() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // 위치 상태 (완전 자율)
  const [userLocation, setUserLocation] = useState(null);
  const [geoSupport, setGeoSupport] = useState(true);
  const [geoState, setGeoState] = useState("prompt"); // granted | denied | prompt
  const [lastGeoError, setLastGeoError] = useState(null);

  const [maxDistance, setMaxDistance] = useState("");
  const [sortOption, setSortOption] = useState("newest");

  // 모바일 토글
  const [showFilters, setShowFilters] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 769px)");

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);

  // 1) 상품 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchProducts();
        const sortedByNewest = [...data].sort(
          (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)
        );
        setProducts(sortedByNewest);
      } catch (err) {
        console.error(err);
        setFetchError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) 권한 상태만 조회(자동 위치 요청 금지)
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoSupport(false);
      return;
    }
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          setGeoState(status.state); // granted | denied | prompt
          status.onchange = () => setGeoState(status.state);
        })
        .catch(() => setGeoState("prompt"));
    }
  }, []);

  // 3) 위치는 버튼으로만 요청
  const requestLocation = () => {
    setLastGeoError(null);
    if (!geoSupport) {
      setLastGeoError("이 브라우저는 위치 기능을 지원하지 않습니다.");
      return;
    }
    if (geoState === "denied") {
      setLastGeoError(
        "위치 권한이 차단되어 있습니다. 주소창 옆의 사이트 정보(아이콘)에서 위치를 허용하고 페이지를 새로고침해 주세요."
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLastGeoError(null);
      },
      (err) => {
        if (err?.code === err.PERMISSION_DENIED) {
          setLastGeoError("위치 접근이 거부되었습니다. 필요하시면 브라우저 설정에서 허용해 주세요.");
        } else if (err?.code === err.POSITION_UNAVAILABLE) {
          setLastGeoError("위치 정보를 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.");
        } else if (err?.code === err.TIMEOUT) {
          setLastGeoError("위치 요청이 시간 초과되었습니다. 다시 시도해 주세요.");
        } else {
          setLastGeoError("위치 요청 중 오류가 발생했습니다.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 }
    );
  };

  // 필터 적용 (카테고리 제외)
  const filteredProducts = useFilteredProducts(products, {
    searchTerm,
    maxPrice,
    maxDistance,
    userLocation,
    sortOption
  });

  // 페이지네이션
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE)),
    [filteredProducts.length]
  );

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  // 필터/정렬 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, maxPrice, maxDistance, sortOption]);

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner aria-live="polite" />
      </LoadingContainer>
    );
  }

  return (
    <Wrapper aria-busy={loading}>
      <Header>귀금속 프리마켓</Header>

      {/* 위치가 없어도 콘텐츠는 항상 표시됩니다 */}
      <ResultCount>총 {filteredProducts.length}개 상품</ResultCount>

      <ToggleButton
        type="button"
        onClick={() => setShowFilters(f => !f)}
        aria-expanded={showFilters}
        aria-controls="filters"
      >
        {showFilters ? "필터 닫기" : "필터 열기"}
      </ToggleButton>

      {(showFilters || isDesktop) && (
        <div id="filters">
          <SortBar>
            <Label htmlFor="sortSelect">
              정렬
              <Select
                id="sortSelect"
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
              >
                {sortOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Label>

            {/* 위치는 자율: 필요 시에만 사용자가 직접 요청 */}
            {!userLocation && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <GhostBtn type="button" onClick={requestLocation}>
                  내 위치 사용(선택)
                </GhostBtn>
                {lastGeoError && (
                  <small style={{ color: "#a94442" }}>{lastGeoError}</small>
                )}
              </div>
            )}
          </SortBar>

          {/* 거리 순 또는 거리 필터를 보고 있을 때만 부드러운 안내 */}
          {!userLocation && (sortOption === "distance" || maxDistance) && (
            <SoftNote>
              거리 기반 정렬/필터는 위치가 있을 때만 적용됩니다. 원하시면 “내 위치 사용(선택)”을 눌러 주세요.
            </SoftNote>
          )}

          <FilterBar>
            <Label>
              상품명 검색
              <Input
                placeholder="검색어 입력"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </Label>

            <Label>
              최대 가격
              <Input
                type="number"
                placeholder="숫자만"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                min="0"
              />
            </Label>

            <Label>
              최대 거리 (km)
              <Input
                type="number"
                placeholder={userLocation ? "거리 입력" : "위치 허용 시 사용 가능"}
                value={maxDistance}
                onChange={e => setMaxDistance(e.target.value)}
                disabled={!userLocation}
                min="0"
                step="1"
              />
            </Label>

            <ResetButton
              type="button"
              onClick={() => {
                setSearchTerm("");
                setMaxPrice("");
                setMaxDistance("");
                setSortOption("newest");
              }}
            >
              전체 초기화
            </ResetButton>
          </FilterBar>
        </div>
      )}

      {fetchError && (
        <SoftNote>
          상품 불러오기 중 오류가 있었어요. 새로고침으로 다시 시도해 주세요.
        </SoftNote>
      )}

      {pageItems.length > 0 ? (
        <>
          <MobileCardGrid>
            {pageItems.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </MobileCardGrid>

          <Pagination aria-label="페이지네이션">
            <PageButton
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(cp => Math.max(1, cp - 1))}
            >
              &lt; 이전
            </PageButton>

            {Array.from({ length: totalPages }, (_, i) => {
              const page = i + 1;
              const isActive = page === currentPage;
              return (
                <PageButton
                  key={page}
                  type="button"
                  $active={isActive}
                  onClick={() => setCurrentPage(page)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {page}
                </PageButton>
              );
            })}

            <PageButton
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(cp => Math.min(totalPages, cp + 1))}
            >
              다음 &gt;
            </PageButton>
          </Pagination>
        </>
      ) : (
        <p role="status" style={{ textAlign: "center", color: "#888" }}>
          조건에 맞는 상품이 없습니다.
        </p>
      )}
    </Wrapper>
  );
}
