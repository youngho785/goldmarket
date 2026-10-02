// src/pages/GoldPrice.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";

import { db, registerForPush } from "@/firebase/firebase";
import { useAuthContext } from "@/context/AuthContext";
import MyGoldTicker from "@/components/gold/MyGoldTicker";
import QuickGoldValueCalculator from "@/components/gold/QuickGoldValueCalculator";
import GuideLinks from "@/components/guide/GuideLinks";
import {
  getNotificationPreferences,
  saveMarketingNotificationConsent,
  saveMarketingPushTarget,
} from "@/services/notificationPreferences";

import {
  Page,
  Shell,
  Hero,
  HeroCard,
  HeroCopy,
  Eyebrow,
  HeroTitle,
  HeroLead,
  HeroPriceBlock,
  PriceLabel,
  HeroPrice,
  HeroPriceValue,
  Won,
  ChangeLine,
  Source,
  GoldVisual,
  PriceGoldMark,
  GoldBar,
  BarInner,
  Section,
  SectionHead,
  SectionKicker,
  SectionTitle,
  SectionNote,
  PriceGrid,
  PriceCard,
  MetalHead,
  MetalBadge,
  MetalName,
  MetalPurity,
  CardBody,
  CardMetric,
  CardChange,
  MobilePriceMatrix,
  MatrixCell,
  MatrixChange,
  AlertCard,
  AlertTitle,
  AlertText,
  AlertBullets,
  AlertBullet,
  ActionArea,
  MainButton,
  SecondaryLink,
  ConsentBox,
  ConsentLabel,
  ConsentAccepted,
  Status,
  RewardCard,
  RewardTop,
  RewardTitle,
  RewardLead,
  QuizButton,
  RewardSummary,
  CrossLink,
  Footnote
} from "@/components/goldPrice/GoldPrice.styles";

function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return window.Notification.permission;
}

function detectBrowserName() {
  if (typeof navigator === "undefined") return "현재 브라우저";

  const ua = String(navigator.userAgent || "");

  if (/SamsungBrowser/i.test(ua)) return "삼성인터넷";
  if (/EdgA|EdgiOS|Edg\//i.test(ua)) return "Microsoft Edge";
  if (/OPR|Opera/i.test(ua)) return "Opera";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/CriOS|Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";

  return "현재 브라우저";
}

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.round(number).toLocaleString("ko-KR")
    : "-";
}

function formatDateKey(value) {
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return text || "-";
  return `${text.slice(0, 4)}.${text.slice(4, 6)}.${text.slice(6, 8)}`;
}

function getKoreaTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}${values.month}${values.day}`;
}

function validPrice(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function changeInfo(current, previous) {
  if (!validPrice(current) || !validPrice(previous)) return null;

  const diff = Number(current) - Number(previous);
  const percent = (diff / Number(previous)) * 100;

  return {
    diff,
    percent,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
  };
}

function changeText(change) {
  if (!change) return "전일 비교 없음";
  if (change.diff === 0) return "－ 보합";

  const arrow = change.diff > 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(change.diff).toLocaleString("ko-KR")}원 · ${Math.abs(
    change.percent
  ).toFixed(2)}%`;
}

function compactChangeText(change) {
  if (!change) return "-";
  if (change.diff === 0) return "보합";
  const arrow = change.diff > 0 ? "▲" : "▼";
  return `${arrow}${Math.abs(change.percent).toFixed(2)}%`;
}

export default function GoldPrice() {
  const navigate = useNavigate();
  const { user, isEmailVerified } = useAuthContext();

  const [pushStatus, setPushStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [marketingNotificationsEnabled, setMarketingNotificationsEnabled] =
    useState(false);
  const [marketingFcmBrowser, setMarketingFcmBrowser] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  const [goldData, setGoldData] = useState(null);
  const [goldEnabled, setGoldEnabled] = useState(false);
  const [goldLoading, setGoldLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [display14kSellPrice, setDisplay14kSellPrice] = useState(false);

  const currentBrowserName = detectBrowserName();
  const isMember = !!user?.uid && user.isAnonymous !== true && isEmailVerified;
  const registerPath = "/register?from=gold-price";
  const loginState = useMemo(() => ({ from: "/gold-price" }), []);

  // GoldPriceBoard는 랜딩페이지 등에서 그대로 사용합니다.
  // 이 전용 페이지는 동일한 공개 시세 문서를 읽어 별도 UI로 표현합니다.
  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPrices", "current"),
        (snapshot) => {
          setGoldData(snapshot.exists() ? snapshot.data() : null);
          setGoldLoading(false);
        },
        (error) => {
          console.warn(
            "[GoldPrice] 시세 조회 실패:",
            error?.message || error
          );
          setGoldLoading(false);
        }
      ),
    []
  );

  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPricePublic", "config"),
        (snapshot) => {
          const config = snapshot.exists() ? snapshot.data() : {};
          setGoldEnabled(config.enabled === true);
          setDisplay14kSellPrice(config.display14kSellPrice === true);
          setConfigLoading(false);
        },
        (error) => {
          console.warn(
            "[GoldPrice] 공개 설정 조회 실패:",
            error?.message || error
          );
          setGoldEnabled(false);
          setConfigLoading(false);
        }
      ),
    []
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setMessage("");

      if (!isMember) {
        if (!cancelled) {
          setMarketingAccepted(false);
          setMarketingNotificationsEnabled(false);
          setConsentChecked(false);
          setPushStatus("guest");
        }
        return;
      }

      if (!isEmailVerified) {
        if (!cancelled) setPushStatus("ready");
        return;
      }

      const permission = getNotificationPermission();

      try {
        const preferences = await getNotificationPreferences(user.uid);

        let localToken = "";
        let localTokenUid = "";
        if (typeof window !== "undefined") {
          try {
            localToken = window.localStorage.getItem("fcmToken") || "";
            localTokenUid =
              window.localStorage.getItem("fcmTokenUid") || "";
          } catch {
            localToken = "";
            localTokenUid = "";
          }
        }

        const currentBrowserIsTarget =
          !!localToken &&
          localTokenUid === user.uid &&
          !!preferences.marketingFcmToken &&
          preferences.marketingFcmToken === localToken;

        if (!cancelled) {
          setMarketingAccepted(preferences.marketingAccepted === true);
          setMarketingNotificationsEnabled(
            preferences.marketingNotificationsEnabled === true
          );
          setMarketingFcmBrowser(preferences.marketingFcmBrowser || "");
          setConsentChecked(preferences.marketingAccepted === true);

          if (permission === "unsupported") {
            setPushStatus("unsupported");
          } else if (permission === "denied") {
            setPushStatus("denied");
          } else {
            setPushStatus(
              permission === "granted" &&
                preferences.marketingNotificationsEnabled === true &&
                currentBrowserIsTarget
                ? "active"
                : "ready"
            );
          }
        }
      } catch {
        if (!cancelled) {
          setPushStatus(
            permission === "unsupported"
              ? "unsupported"
              : permission === "denied"
                ? "denied"
                : "ready"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEmailVerified, isMember, user?.uid]);

  const marketRows = useMemo(() => {
    const market = goldData?.market || {};
    const previous = goldData?.previousMarket || {};

    return [
      {
        label: "순금 (24K)",
        short: "24K",
        purity: "GOLD 999.9",
        metal: "pure",
        dark: true,
        sellKey: "pureGoldSellPerDon",
        sell: market.pureGoldSellPerDon,
        buy: market.pureGoldBuyPerDon,
        previousSell: previous.pureGoldSellPerDon,
        previousBuy: previous.pureGoldBuyPerDon,
      },
      {
        label: "18K",
        short: "18K",
        purity: "GOLD 75.0%",
        metal: "18k",
        dark: false,
        sellKey: "gold18kSellPerDon",
        sell: market.gold18kSellPerDon,
        buy: market.gold18kBuyPerDon,
        previousSell: previous.gold18kSellPerDon,
        previousBuy: previous.gold18kBuyPerDon,
      },
      {
        label: "14K",
        short: "14K",
        purity: "GOLD 58.5%",
        metal: "14k",
        dark: false,
        sellKey: "gold14kSellPerDon",
        sell: market.gold14kSellPerDon,
        buy: market.gold14kBuyPerDon,
        previousSell: previous.gold14kSellPerDon,
        previousBuy: previous.gold14kBuyPerDon,
      },
    ];
  }, [goldData]);

  const pureRow = marketRows[0];
  const heroChange = changeInfo(pureRow?.buy, pureRow?.previousBuy);
  const referenceDate = formatDateKey(
    goldData?.sourceDate || getKoreaTodayDateKey()
  );
  const pagePriceAvailable =
    !configLoading && goldEnabled && !goldLoading && !!goldData;

  const enableGoldPricePush = async () => {
    if (!isMember) {
      navigate(registerPath, {
        state: {
          from: "/gold-price",
          intent: "gold-price-notification",
        },
      });
      return;
    }

    if (!isEmailVerified) {
      navigate("/verify-email?continueUrl=%2Fgold-price", {
        state: { from: "/gold-price" },
      });
      return;
    }

    if (!marketingAccepted && !consentChecked) {
      setMessage(
        "금시세 알림을 받으려면 광고성 정보 수신동의(선택)를 확인해 주세요."
      );
      return;
    }

    const permission = getNotificationPermission();

    if (permission === "unsupported") {
      setPushStatus("unsupported");
      return;
    }

    if (permission === "denied") {
      setPushStatus("denied");
      setMessage(
        "브라우저 설정에서 한국골드마켓 알림 권한을 허용한 뒤 다시 시도해 주세요."
      );
      return;
    }

    setPushStatus("enabling");
    setMessage("");

    try {
      const token = await registerForPush(user.uid);

      if (!token) {
        const currentPermission = getNotificationPermission();

        if (currentPermission === "denied") {
          setPushStatus("denied");
          setMessage(
            "알림 권한이 차단되어 있습니다. 브라우저 사이트 설정에서 알림을 허용해 주세요."
          );
        } else {
          setPushStatus("error");
          setMessage(
            "이 기기에서 푸시 알림을 등록하지 못했습니다. 브라우저 알림 지원 여부를 확인해 주세요."
          );
        }
        return;
      }

      const saved = await saveMarketingNotificationConsent(user.uid, true);

      const target = await saveMarketingPushTarget(
        user.uid,
        token,
        currentBrowserName
      );

      setMarketingAccepted(saved.marketingAccepted === true);
      setMarketingNotificationsEnabled(
        saved.marketingNotificationsEnabled === true
      );
      setMarketingFcmBrowser(
        target.marketingFcmBrowser || currentBrowserName
      );
      setConsentChecked(true);

      setPushStatus("active");
      setMessage(
        `${currentBrowserName}에서 금시세·소식·혜택 알림을 받도록 설정했습니다.`
      );
    } catch (error) {
      console.error("[GoldPrice] push enable failed:", error);
      setPushStatus("error");
      setMessage(error?.message || "알림 설정 중 오류가 발생했습니다.");
    }
  };

  const notificationActive =
    pushStatus === "active" ||
    (isEmailVerified &&
      marketingAccepted &&
      marketingNotificationsEnabled);

  return (
    <Page>
      <MyGoldTicker />
      <Shell>
        <Hero>
          <HeroCard>
            <HeroCopy>
              <Eyebrow>KOREA GOLD MARKET</Eyebrow>
              <HeroTitle>오늘의 금시세</HeroTitle>
              <HeroLead>
                내가 팔 때 가격부터 확인하고, 오늘 시세가 MY GOLD 가치에 미치는 변화까지 이어서 보세요.
              </HeroLead>

              <HeroPriceBlock>
                <PriceLabel>순금(24K) 내가 팔 때 · 1돈(3.75g)</PriceLabel>
                <HeroPrice>
                  <HeroPriceValue>
                    {pagePriceAvailable ? formatWon(pureRow?.buy) : "-"}
                  </HeroPriceValue>
                  <Won>원</Won>
                </HeroPrice>

                <ChangeLine $direction={heroChange?.direction}>
                  <span>
                    {pagePriceAvailable
                      ? changeText(heroChange)
                      : configLoading || goldLoading
                        ? "시세 확인 중"
                        : "관리자 공개 후 표시"}
                  </span>
                  <Source>기준일 {referenceDate}</Source>
                </ChangeLine>
              </HeroPriceBlock>
            </HeroCopy>

            <PriceGoldMark
              size={54}
              delay={240}
              hint
              ariaLabel="Living Gold 반짝이기"
            />

            <GoldVisual>
              <GoldBar aria-hidden>
                <BarInner>
                  <strong>KGM</strong>
                  <span>
                    FINE GOLD
                    <br />
                    999.9
                    <br />
                    3.75g
                  </span>
                </BarInner>
              </GoldBar>
            </GoldVisual>
          </HeroCard>
        </Hero>


        <Section aria-labelledby="live-gold-price-title">
          <SectionHead>
            <div>
              <SectionTitle id="live-gold-price-title">
                지금 금시세
              </SectionTitle>
            </div>
            <SectionNote>
              1돈(3.75g) 기준 · 내가 살 때는 <b>VAT 포함</b> · 단위 원
            </SectionNote>
          </SectionHead>

          <PriceGrid>
            {marketRows.map((row) => {
              const sellChange = changeInfo(row.sell, row.previousSell);
              const showProductText =
                row.sellKey === "gold14kSellPerDon" &&
                !display14kSellPrice;

              return (
                <PriceCard key={row.short}>
                  <MetalHead
                    $metal={row.metal}
                    $dark={row.dark}
                  >
                    <MetalBadge $dark={row.dark}>{row.short}</MetalBadge>
                    <div>
                      <MetalName>{row.label}</MetalName>
                      <MetalPurity>{row.purity}</MetalPurity>
                    </div>
                  </MetalHead>

                  <CardBody>
                    <CardMetric>
                      <span>살 때 <small>(VAT 포함)</small></span>
                      <strong>
                        {!pagePriceAvailable
                          ? "-"
                          : showProductText
                            ? "제품 시세 적용"
                            : formatWon(row.sell)}
                      </strong>
                    </CardMetric>
                    <CardMetric $right>
                      <span>팔 때</span>
                      <strong>
                        {pagePriceAvailable ? formatWon(row.buy) : "-"}
                      </strong>
                    </CardMetric>
                  </CardBody>

                  <CardChange $direction={sellChange?.direction}>
                    {pagePriceAvailable && !showProductText
                      ? `전일 대비 ${changeText(sellChange)}`
                      : showProductText
                        ? "14K 제품은 공임을 별도 확인합니다."
                        : "시세 확인 중"}
                  </CardChange>
                </PriceCard>
              );
            })}
          </PriceGrid>

          <MobilePriceMatrix aria-label="모바일 금시세 요약">
            <MatrixCell $top $first $head />
            {marketRows.map((row) => (
              <MatrixCell
                key={`head-${row.short}`}
                $top
                $head
                $metal={row.metal}
              >
                <strong>{row.short}</strong>
                <small>{row.short === "24K" ? "순금" : row.label}</small>
              </MatrixCell>
            ))}

            <MatrixCell $first $label>
              살 때
              <small>VAT 포함</small>
            </MatrixCell>
            {marketRows.map((row) => {
              const showProductText =
                row.sellKey === "gold14kSellPerDon" &&
                !display14kSellPrice;
              return (
                <MatrixCell key={`sell-${row.short}`}>
                  <strong>
                    {!pagePriceAvailable
                      ? "-"
                      : showProductText
                        ? "제품 시세"
                        : formatWon(row.sell)}
                  </strong>
                </MatrixCell>
              );
            })}

            <MatrixCell $first $label>팔 때</MatrixCell>
            {marketRows.map((row) => (
              <MatrixCell key={`buy-${row.short}`}>
                <strong>
                  {pagePriceAvailable ? formatWon(row.buy) : "-"}
                </strong>
              </MatrixCell>
            ))}

            <MatrixCell $first $label>전일</MatrixCell>
            {marketRows.map((row) => {
              const sellChange = changeInfo(row.sell, row.previousSell);
              const showProductText =
                row.sellKey === "gold14kSellPerDon" &&
                !display14kSellPrice;
              return (
                <MatrixCell key={`change-${row.short}`}>
                  <MatrixChange $direction={sellChange?.direction}>
                    {pagePriceAvailable && !showProductText
                      ? compactChangeText(sellChange)
                      : showProductText
                        ? "제품별"
                        : "-"}
                  </MatrixChange>
                </MatrixCell>
              );
            })}
          </MobilePriceMatrix>
        </Section>

        <Section aria-labelledby="gold-price-my-gold-title">
          <SectionHead>
            <div>
              <SectionKicker>MY GOLD</SectionKicker>
              <SectionTitle id="gold-price-my-gold-title">
                시세를 봤다면, 이제 내 금으로 계산해 보세요.
              </SectionTitle>
            </div>
            <SectionNote>
              MY GOLD는 실물 금을 맡기는 서비스가 아니라 내가 가진 금을 기록해 참고가치와 변화를 확인하는 공간입니다.
            </SectionNote>
          </SectionHead>

          <QuickGoldValueCalculator
            source="gold-price"
            eyebrow="오늘 시세 · 내 금 계산"
            title="내 금은 오늘 얼마일까요?"
            description="금 종류와 중량을 입력하면 오늘 공개 시세를 기준으로 참고가치와 예상 순금량을 확인합니다."
            compact
          />
        </Section>

        <Section aria-labelledby="gold-price-alert-title">
          <AlertCard>
            <div>
              <AlertTitle id="gold-price-alert-title">
                금값이 움직일 때, <em>먼저 알려드릴게요.</em>
              </AlertTitle>
              <AlertText>
                매번 확인하지 않아도 주요 금시세 변동을 알려드립니다.
                MY GOLD에 내 금을 기록해 두면 주간 가치 변화도 함께 받아볼 수 있습니다.
              </AlertText>

              <AlertBullets>
                <AlertBullet>
                  <BellRing size={15} aria-hidden />
                  주요 금시세 변동 알림
                </AlertBullet>
                <AlertBullet>
                  <CheckCircle2 size={15} aria-hidden />
                  MY GOLD 주간 가치 리포트
                </AlertBullet>
                <AlertBullet>
                  <ShieldCheck size={15} aria-hidden />
                  알림 수신 여부는 언제든 설정에서 변경
                </AlertBullet>
              </AlertBullets>
            </div>

              <ActionArea>
                {pushStatus === "guest" ? (
                  <>
                    <MainButton
                      as={Link}
                      to={registerPath}
                      state={{
                        from: "/gold-price",
                        intent: "gold-price-notification",
                      }}
                    >
                      간편가입하고 알림 받기
                      <ArrowRight size={18} aria-hidden />
                    </MainButton>

                    <SecondaryLink
                      to="/login?from=gold-price"
                      state={loginState}
                    >
                      <LogIn size={15} aria-hidden />
                      이미 회원이라면 로그인
                    </SecondaryLink>
                  </>
                ) : notificationActive ? (
                  <>
                    <MainButton type="button" disabled>
                      <CheckCircle2 size={18} aria-hidden />
                      금시세 알림을 받고 있습니다
                    </MainButton>
                    <SecondaryLink to="/settings">
                      알림 설정 관리
                    </SecondaryLink>
                  </>
                ) : (
                  <>
                    {isEmailVerified && (
                      <ConsentBox>
                        {marketingAccepted ? (
                          <ConsentAccepted>
                            <CheckCircle2 size={16} aria-hidden />
                            <span>
                              광고성 정보 수신동의가 확인되어 있습니다.
                              {marketingNotificationsEnabled
                                ? marketingFcmBrowser
                                  ? ` 현재 ${marketingFcmBrowser}로 알림을 받고 있습니다.`
                                  : " 대표 수신 브라우저를 선택해 주세요."
                                : " 아래 버튼을 누르면 금시세·소식·혜택 알림을 다시 활성화할 수 있습니다."}
                            </span>
                          </ConsentAccepted>
                        ) : (
                          <ConsentLabel>
                            <input
                              type="checkbox"
                              checked={consentChecked}
                              onChange={(event) =>
                                setConsentChecked(event.target.checked)
                              }
                            />
                            <span>
                              <strong>금시세 알림 받기</strong>
                              <small>
                                주요 시세 변동·혜택 알림 · 광고성 정보
                                수신동의(선택)
                              </small>
                            </span>
                          </ConsentLabel>
                        )}
                      </ConsentBox>
                    )}

                    <MainButton
                      type="button"
                      onClick={enableGoldPricePush}
                      disabled={
                        pushStatus === "checking" ||
                        pushStatus === "enabling"
                      }
                    >
                      <BellRing size={18} aria-hidden />
                      {pushStatus === "checking"
                        ? "알림 상태 확인 중…"
                        : pushStatus === "enabling"
                          ? "알림 설정 중…"
                          : !isEmailVerified
                            ? "이메일 인증 후 금시세 알림 받기"
                            : "금시세 알림 받고 순금 0.01g 더 받기"}
                    </MainButton>

                    {pushStatus === "denied" && (
                      <Status $error>
                        알림이 차단되어 있습니다. 브라우저의 사이트
                        설정에서 알림 권한을 허용해 주세요.
                      </Status>
                    )}

                    {pushStatus === "unsupported" && (
                      <Status $error>
                        현재 브라우저에서는 웹 푸시 알림을 사용할 수
                        없습니다.
                      </Status>
                    )}

                    {(pushStatus === "error" || message) &&
                      pushStatus !== "denied" && (
                        <Status $error={pushStatus === "error"}>
                          {message}
                        </Status>
                      )}
                  </>
                )}
              </ActionArea>

          </AlertCard>
        </Section>

        <Section aria-labelledby="gold-benefit-title">
          <RewardCard>
            <RewardTop>
              <div>
                <SectionKicker>MEMBER GOLD</SectionKicker>
                <RewardTitle id="gold-benefit-title">
                  회원 혜택 <span>최대 순금 0.03g</span>
                </RewardTitle>
                <RewardLead>
                  회원가입 · 퀵퀴즈 · 금시세 알림에 참여하며 순금 혜택을 이어가세요.
                </RewardLead>
                <RewardSummary aria-label="회원 혜택 구성">
                  <span>회원가입 <b>0.01g</b></span>
                  <i>│</i>
                  <span>퀵퀴즈 <b>0.01g</b></span>
                  <i>│</i>
                  <span>금시세 알림 <b>{notificationActive ? "수신 중" : "0.01g"}</b></span>
                </RewardSummary>
              </div>

              <QuizButton to="/quiz/gold-bonus">
                퀵퀴즈 참여하기
                <ArrowRight size={15} aria-hidden />
              </QuizButton>
            </RewardTop>

          </RewardCard>

        </Section>

        <Section aria-label="GOLD TO GOLD 안내">
          <CrossLink to="/gold-to-gold" aria-label="GOLD TO GOLD 알아보기">
            <div>
              <span className="gold-kicker">GOLD TO GOLD</span>
              <strong>쓰임은 달라져도, 금의 가치는 이어집니다.</strong>
              <p>
                보유한 금의 가치를 999.9 GOLD로 이어가는 GOLD TO GOLD가
                어떤 방식인지 먼저 확인해보세요.
              </p>
              <span className="gold-action">
                GOLD TO GOLD 알아보기
              </span>
            </div>
            <ArrowRight size={22} aria-hidden />
          </CrossLink>

          <Footnote>
            금시세는 시장 상황에 따라 변경될 수 있으며, 실제 거래
            시점의 시세와 다를 수 있습니다.
          </Footnote>
        </Section>

        <GuideLinks
          title="금시세와 함께 읽기"
          slugs={["gold-don-gram", "14k-18k-24k", "gold-selling-price"]}
        />
      </Shell>
    </Page>
  );
}
