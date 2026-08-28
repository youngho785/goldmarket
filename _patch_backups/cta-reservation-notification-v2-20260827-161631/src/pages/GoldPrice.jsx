// src/pages/GoldPrice.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  LogIn,
  ShieldCheck,
} from "lucide-react";

import GoldPriceBoard from "@/components/gold/GoldPriceBoard";
import { useAuthContext } from "@/context/AuthContext";
import { registerForPush } from "@/firebase/firebase";
import {
  getNotificationPreferences,
  saveMarketingNotificationConsent,
  saveMarketingPushTarget,
} from "@/services/notificationPreferences";

const Page = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
`;

const Hero = styled.section`
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: clamp(36px, 5.5vw, 66px) 0 22px;
  text-align: center;

  @media (max-width: 680px) {
    width: calc(100% - 20px);
    padding-top: 28px;
  }
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.95rem, 4.2vw, 3.3rem);
  line-height: 1.15;
  letter-spacing: -0.035em;
  word-break: keep-all;
`;

const BoardWrap = styled.section`
  padding-top: 4px;
`;

const CtaSection = styled.section`
  width: min(920px, calc(100% - 32px));
  margin: 22px auto clamp(52px, 7vw, 84px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: 680px) {
    width: calc(100% - 20px);
  }
`;

const CtaTop = styled.div`
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 16px;
  padding: clamp(21px, 4vw, 31px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 520px) {
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 12px;
    padding: 19px 15px;
  }
`;

const IconBox = styled.div`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.secondaryDark};

  @media (max-width: 520px) {
    width: 40px;
    height: 40px;
  }
`;

const CtaCopy = styled.div`
  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.18rem, 2.3vw, 1.5rem);
    line-height: 1.35;
    word-break: keep-all;
  }

  p {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.88rem;
    line-height: 1.6;
    word-break: keep-all;
  }
`;

const Benefits = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const Benefit = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: 12px 18px;
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.82rem;
  font-weight: 750;

  &:first-child {
    border-left: 0;
  }

  svg {
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  @media (max-width: 680px) {
    border-left: 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border};

    &:first-child {
      border-top: 0;
    }
  }
`;

const ActionArea = styled.div`
  display: grid;
  gap: 10px;
  padding: clamp(18px, 3vw, 24px);
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const MainButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 52px;
  padding: 13px 18px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-size: 0.96rem;
  font-weight: 850;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.colors.primaryDark};
    color: ${({ theme }) => theme.colors.white};
  }

  &:disabled {
    opacity: 0.7;
    cursor: default;
  }
`;

const SecondaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.84rem;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 4px;
`;

const ConsentBox = styled.div`
  display: grid;
  gap: 8px;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
`;

const ConsentLabel = styled.label`
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 9px;
  align-items: start;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    margin: 2px 0 0;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.text};
    font-size: .86rem;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .76rem;
    line-height: 1.5;
  }
`;

const ConsentAccepted = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .8rem;
  line-height: 1.5;

  svg {
    flex: 0 0 auto;
    margin-top: 1px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const Status = styled.p`
  margin: 0;
  color: ${({ $error, theme }) =>
    $error
      ? theme.semantic?.alertErrorText || theme.colors.error
      : theme.colors.textSecondary};
  font-size: 0.82rem;
  line-height: 1.55;
  text-align: center;
  word-break: keep-all;
`;

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

export default function GoldPrice() {
  const navigate = useNavigate();
  const { user, isEmailVerified } = useAuthContext();
  const [pushStatus, setPushStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [marketingNotificationsEnabled, setMarketingNotificationsEnabled] = useState(false);
  const [marketingFcmBrowser, setMarketingFcmBrowser] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  const currentBrowserName = detectBrowserName();
  const isMember = !!user?.uid && user.isAnonymous !== true;
  const registerPath = "/register?from=gold-price";
  const loginState = useMemo(() => ({ from: "/gold-price" }), []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "오늘의 금시세 | 한국골드마켓";
    return () => {
      document.title = previousTitle;
    };
  }, []);

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
      setMessage("금시세 알림을 받으려면 광고성 정보 수신동의(선택)를 확인해 주세요.");
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

      // 계정 단위 수신동의를 활성화한 뒤,
      // 현재 브라우저를 금시세·혜택 대표 수신 브라우저 1개로 지정합니다.
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
      setMarketingFcmBrowser(target.marketingFcmBrowser || currentBrowserName);
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

  return (
    <Page>
      <Hero>
        <Title>오늘의 금시세</Title>
      </Hero>

      <BoardWrap>
        <GoldPriceBoard />
      </BoardWrap>

      <CtaSection aria-labelledby="gold-price-alert-title">
        <CtaTop>
          <IconBox>
            <BellRing size={24} aria-hidden />
          </IconBox>

          <CtaCopy>
            <h2 id="gold-price-alert-title">
              금시세 알림을 받아보세요.
            </h2>
            <p>
              주요 시세 변동과 혜택을 현재 기기로 알려드립니다.
            </p>
          </CtaCopy>
        </CtaTop>

        <Benefits>
          <Benefit>
            <CheckCircle2 size={16} aria-hidden />
            금시세 확인은 회원가입 없이
          </Benefit>
          <Benefit>
            <BellRing size={16} aria-hidden />
            주요 금시세 변동 알림
          </Benefit>
          <Benefit>
            <ShieldCheck size={16} aria-hidden />
            신규회원 알림 설정 시 0.01g 추가 혜택
          </Benefit>
        </Benefits>

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
                회원가입하고 순금 0.01g 받기
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
          ) : pushStatus === "active" ? (
            <>
              <MainButton type="button" disabled>
                <CheckCircle2 size={18} aria-hidden />
                금시세 알림을 받고 있습니다
              </MainButton>
              <Status>
                {message ||
                  `현재 ${currentBrowserName}에서 금시세·소식·혜택 알림을 받고 있습니다.`}
              </Status>
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
                        onChange={(event) => setConsentChecked(event.target.checked)}
                      />
                      <span>
                        <strong>금시세 알림 받기</strong>
                        <small>
                          주요 시세 변동·혜택 알림 · 광고성 정보 수신동의(선택)
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
                  pushStatus === "checking" || pushStatus === "enabling"
                }
              >
                <BellRing size={18} aria-hidden />
                {pushStatus === "checking"
                  ? "알림 상태 확인 중…"
                  : pushStatus === "enabling"
                    ? "알림 설정 중…"
                    : !isEmailVerified
                      ? "이메일 인증 후 금시세 알림 받기"
                      : marketingAccepted && marketingNotificationsEnabled
                        ? `이 브라우저(${currentBrowserName})로 알림 받기`
                        : "금시세 알림 받고 0.01g 더 받기"}
              </MainButton>

              {pushStatus === "denied" && (
                <Status $error>
                  알림이 차단되어 있습니다. 브라우저의 사이트 설정에서
                  알림 권한을 허용해 주세요.
                </Status>
              )}

              {pushStatus === "unsupported" && (
                <Status $error>
                  현재 브라우저에서는 웹 푸시 알림을 사용할 수 없습니다.
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

          <SecondaryLink to="/gold-exchange">
            보유 금의 골드바 교환 예상량도 확인하기
            <ArrowRight size={15} aria-hidden />
          </SecondaryLink>
        </ActionArea>
      </CtaSection>
    </Page>
  );
}