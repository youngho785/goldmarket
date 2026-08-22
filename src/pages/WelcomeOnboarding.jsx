// src/pages/WelcomeOnboarding.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { BellRing, Check, ChevronRight, Gift, Sparkles } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import { registerForPush } from "@/firebase/firebase";
import { isAndroid } from "@/platform/runtime";
import { requestNativePushPermission } from "@/push/nativePush";
import {
  claimWelcomeGoldBonus,
  getMemberBonusStatus,
} from "@/services/quizClient";
import {
  saveMarketingNotificationConsent,
  saveMarketingPushTarget,
} from "@/services/notificationPreferences";
import {
  buildVerifyEmailPath,
  sanitizeAppReturnPath,
} from "@/lib/authReturn";
import {
  clearMemberOnboardingPending,
} from "@/lib/memberOnboarding";

const Page = styled.main`
  max-width: 760px;
  margin: 0 auto;
  padding: 20px 0 56px;
  color: ${({ theme }) => theme.colors.text};
`;

const Hero = styled.section`
  position: relative;
  overflow: hidden;
  padding: clamp(24px, 5vw, 38px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  background:
    radial-gradient(
      circle at 100% 0%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent),
      transparent 42%
    ),
    ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};

  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 4px;
    background: ${({ theme }) => theme.gradients.gold};
  }
`;

const Kicker = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.08em;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.8rem, 5vw, 2.65rem);
  line-height: 1.2;
  letter-spacing: -0.035em;
  word-break: keep-all;
`;

const Lead = styled.p`
  margin: 13px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.7;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;

  b {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ProgressTrack = styled.div`
  height: 10px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.border};
`;

const ProgressBar = styled.div`
  width: ${({ $progress }) => `${$progress}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.gradients.gold};
  transition: width 220ms ease;
`;

const Steps = styled.div`
  display: grid;
  gap: 14px;
  margin-top: 18px;
`;

const StepCard = styled.section`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  padding: 18px;
  border: 1px solid
    ${({ $done, theme }) =>
      $done ? theme.colors.secondary : theme.colors.border};
  border-radius: 14px;
  background: ${({ $done, theme }) =>
    $done ? theme.semantic.alertSuccessBg : theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.xs};

  @media (max-width: 520px) {
    grid-template-columns: 36px minmax(0, 1fr);
    padding: 16px;
  }
`;

const StepIcon = styled.div`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: ${({ $done, theme }) =>
    $done ? theme.colors.primary : theme.semantic.badgeGoldBg};
  color: ${({ $done, theme }) =>
    $done ? theme.on.primary : theme.colors.primary};

  svg {
    width: 20px;
    height: 20px;
  }

  @media (max-width: 520px) {
    width: 36px;
    height: 36px;
  }
`;

const StepBody = styled.div`
  min-width: 0;
`;

const StepTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-size: 1.03rem;
    line-height: 1.45;
  }

  b {
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.primary};
    white-space: nowrap;
  }
`;

const StepDescription = styled.p`
  margin: 7px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  line-height: 1.6;
  word-break: keep-all;
`;

const ConsentNote = styled.p`
  margin: 10px 0 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.78rem;
  line-height: 1.55;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  min-height: 48px;
  margin-top: 13px;
  padding: 11px 15px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  font: inherit;
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  svg {
    width: 17px;
    height: 17px;
  }
`;

const OutlineButton = styled(ActionButton)`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
`;

const VerifyCard = styled.section`
  margin-top: 18px;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.secondary}66;
  border-radius: 14px;
  background: ${({ theme }) => theme.semantic.alertWarningBg};

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-size: 1rem;
  }

  p {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.88rem;
    line-height: 1.6;
  }
`;

const Message = styled.p`
  margin: 16px 0 0;
  padding: 11px 13px;
  border-radius: 10px;
  color: ${({ $error, theme }) =>
    $error
      ? theme.semantic.alertErrorText
      : theme.semantic.alertSuccessText};
  background: ${({ $error, theme }) =>
    $error
      ? theme.semantic.alertErrorBg
      : theme.semantic.alertSuccessBg};
  line-height: 1.55;
`;

const FooterActions = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 18px;
`;

const SkipButton = styled.button`
  min-height: 42px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  font: inherit;
  font-weight: 750;
  cursor: pointer;
`;

function deviceName() {
  if (isAndroid) return "한국골드마켓 앱";
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

function rewardStatus(source) {
  const rewards = source?.rewards || {};
  return {
    maxG: Number(source?.maxG ?? 0.03),
    earnedG: Number(source?.earnedG ?? 0),
    balanceG: Number(source?.balanceG ?? 0),
    welcome: {
      claimed: !!rewards.welcome?.claimed,
      creditedG: Number(rewards.welcome?.creditedG || 0),
    },
    marketingPush: {
      claimed: !!rewards.marketingPush?.claimed,
      creditedG: Number(rewards.marketingPush?.creditedG || 0),
    },
    quiz: {
      claimed: !!rewards.quiz?.claimed,
      creditedG: Number(rewards.quiz?.creditedG || 0),
    },
  };
}

export default function WelcomeOnboarding() {
  const { user, isEmailVerified } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return sanitizeAppReturnPath(params.get("next"), "/");
  }, [location.search]);

  const welcomePath = useMemo(
    () => `/welcome?next=${encodeURIComponent(nextPath)}`,
    [nextPath]
  );

  const [status, setStatus] = useState(() => rewardStatus(null));
  const [loading, setLoading] = useState(true);
  const [marketingBusy, setMarketingBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshStatus = useCallback(async () => {
    if (!user?.uid) return null;

    try {
      // 가입 직후 네트워크가 잠깐 끊겼던 경우에도 웰컴 적립을 보정합니다.
      await claimWelcomeGoldBonus();
    } catch {}

    const next = await getMemberBonusStatus();
    setStatus(rewardStatus(next));
    return next;
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;

    if (!user?.uid) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setLoading(true);
      setError("");

      try {
        const next = await refreshStatus();
        if (cancelled || !next) return;
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              "신규회원 혜택 상태를 확인하지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshStatus, user?.uid]);

  const handleMarketingReward = async () => {
    if (!user?.uid || marketingBusy || status.marketingPush.claimed) return;

    setMarketingBusy(true);
    setMessage("");
    setError("");

    try {
      let token = "";

      // 버튼을 누른 경우에만 OS/브라우저 알림 권한을 요청합니다.
      if (isAndroid) {
        const result = await requestNativePushPermission(user.uid);
        if (result?.permission !== "granted") {
          throw new Error(
            "앱 알림 허용이 필요합니다. 휴대폰 설정에서 한국골드마켓 알림을 허용해 주세요."
          );
        }
        token = String(result?.token || "").trim();
      } else {
        if (
          typeof window === "undefined" ||
          !("Notification" in window)
        ) {
          throw new Error(
            "현재 브라우저에서는 알림을 사용할 수 없습니다. 알림을 지원하는 브라우저에서 다시 시도해 주세요."
          );
        }

        if (window.Notification.permission === "denied") {
          throw new Error(
            "브라우저에서 알림이 차단되어 있습니다. 사이트 알림을 허용한 뒤 다시 시도해 주세요."
          );
        }

        token = String((await registerForPush(user.uid)) || "").trim();
      }

      if (!token) {
        throw new Error(
          "알림 기기 등록을 완료하지 못했습니다. 알림 권한을 확인한 뒤 다시 시도해 주세요."
        );
      }

      // 실제 수신 기기가 준비된 뒤 선택 동의를 저장합니다.
      await saveMarketingNotificationConsent(user.uid, true);
      const saved = await saveMarketingPushTarget(
        user.uid,
        token,
        deviceName()
      );

      await refreshStatus();

      if (saved?.marketingBonusError) {
        setMessage(
          "알림 설정은 완료되었습니다. 순금 적립 상태를 다시 확인하고 있습니다."
        );
      } else {
        setMessage(
          "금시세·혜택 알림 설정이 완료되어 순금 0.01g이 추가 적립되었습니다."
        );
      }
    } catch (actionError) {
      setError(
        actionError?.message ||
          "알림 설정을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setMarketingBusy(false);
    }
  };

  const handleQuiz = () => {
    navigate(
      `/quiz/gold-bonus?next=${encodeURIComponent(welcomePath)}`
    );
  };

  const handleFinish = () => {
    clearMemberOnboardingPending();
    navigate(nextPath, { replace: true });
  };

  const handleSkip = () => {
    clearMemberOnboardingPending();

    if (!isEmailVerified) {
      navigate(buildVerifyEmailPath(nextPath), {
        replace: true,
      });
      return;
    }

    navigate(nextPath, { replace: true });
  };

  const claimedCount =
    Number(status.welcome.claimed) +
    Number(status.marketingPush.claimed) +
    Number(status.quiz.claimed);
  const progress = Math.round((claimedCount / 3) * 100);
  const allRewardsClaimed = claimedCount === 3;

  const finishLabel =
    nextPath.startsWith("/gold-exchange")
      ? "선택한 일정으로 예약 계속하기"
      : "한국골드마켓 시작하기";

  return (
    <Page>
      <Hero>
        <Kicker>WELCOME TO KOREA GOLD MARKET</Kicker>
        <Title>
          {allRewardsClaimed
            ? "신규회원 혜택 0.03g 달성 🎉"
            : "회원가입을 축하합니다 🎉"}
        </Title>
        <Lead>
          회원가입 웰컴 순금 <strong>0.01g</strong>부터 시작해
          알림과 퀵퀴즈 참여로 최대 <strong>0.03g</strong>까지
          적립할 수 있습니다. 적립된 순금은 골드바 교환 시 사용할 수
          있습니다.
        </Lead>

        <ProgressText>
          <span>신규회원 혜택 진행</span>
          <b>
            {status.earnedG.toFixed(2)}g / {status.maxG.toFixed(2)}g
          </b>
        </ProgressText>
        <ProgressTrack aria-label={`신규회원 혜택 진행률 ${progress}%`}>
          <ProgressBar $progress={progress} />
        </ProgressTrack>
      </Hero>

      <Steps>
        <StepCard $done={status.welcome.claimed}>
          <StepIcon $done={status.welcome.claimed}>
            {status.welcome.claimed ? <Check /> : <Gift />}
          </StepIcon>
          <StepBody>
            <StepTop>
              <h2>1. 회원가입 웰컴 순금</h2>
              <b>
                {status.welcome.claimed
                  ? `${status.welcome.creditedG.toFixed(2)}g 적립`
                  : "0.01g"}
              </b>
            </StepTop>
            <StepDescription>
              회원가입 완료 혜택입니다. 골드바 교환 시 적립 순금으로
              사용할 수 있습니다.
            </StepDescription>
          </StepBody>
        </StepCard>

        <StepCard $done={status.marketingPush.claimed}>
          <StepIcon $done={status.marketingPush.claimed}>
            {status.marketingPush.claimed ? <Check /> : <BellRing />}
          </StepIcon>
          <StepBody>
            <StepTop>
              <h2>2. 내 금의 가치 변화 알림</h2>
              <b>
                {status.marketingPush.claimed
                  ? `${status.marketingPush.creditedG.toFixed(2)}g 적립`
                  : "+0.01g"}
              </b>
            </StepTop>
            <StepDescription>
              금시세의 주요 변동과 한국골드마켓 혜택을 알림으로
              받아보세요. 현재 기기를 대표 알림 수신 기기로
              등록합니다.
            </StepDescription>

            {!status.marketingPush.claimed && (
              <>
                <ActionButton
                  type="button"
                  onClick={handleMarketingReward}
                  disabled={marketingBusy || loading}
                >
                  <BellRing />
                  {marketingBusy
                    ? "알림 설정 중…"
                    : "알림에 동의하고 0.01g 더 받기"}
                </ActionButton>
                <ConsentNote>
                  선택 사항입니다. 버튼을 누르면 금시세·혜택 등 광고성
                  정보 알림 수신에 동의하며, 설정에서 언제든 해제할 수
                  있습니다. 알림을 해제해도 이미 적립된 혜택은 회수하지
                  않습니다.
                </ConsentNote>
              </>
            )}
          </StepBody>
        </StepCard>

        <StepCard $done={status.quiz.claimed}>
          <StepIcon $done={status.quiz.claimed}>
            {status.quiz.claimed ? <Check /> : <Sparkles />}
          </StepIcon>
          <StepBody>
            <StepTop>
              <h2>3. 금 상식 퀵퀴즈 5문제</h2>
              <b>
                {status.quiz.claimed
                  ? `${status.quiz.creditedG.toFixed(2)}g 적립`
                  : "+0.01g"}
              </b>
            </StepTop>
            <StepDescription>
              5문제를 모두 맞히면 마지막 순금 0.01g을 추가로 받을 수
              있습니다.
            </StepDescription>

            {!status.quiz.claimed && (
              <OutlineButton
                type="button"
                onClick={handleQuiz}
                disabled={loading}
              >
                퀴즈 풀고 0.01g 받기
                <ChevronRight />
              </OutlineButton>
            )}
          </StepBody>
        </StepCard>
      </Steps>

      {!isEmailVerified && (
        <VerifyCard>
          <h2>서비스 이용 전 이메일 인증을 완료해 주세요</h2>
          <p>
            가입하신 이메일로 인증 링크를 보내드렸습니다. 혜택은 먼저
            확인할 수 있지만 예약·내정보 등 회원 기능을 계속 이용하려면
            이메일 인증이 필요합니다.
          </p>
          <OutlineButton
            type="button"
            onClick={() =>
              navigate(buildVerifyEmailPath(welcomePath))
            }
          >
            이메일 인증 확인하기
            <ChevronRight />
          </OutlineButton>
        </VerifyCard>
      )}

      {message && <Message aria-live="polite">{message}</Message>}
      {error && (
        <Message $error role="alert">
          {error}
        </Message>
      )}

      <FooterActions>
        {isEmailVerified && (
          <ActionButton type="button" onClick={handleFinish}>
            {finishLabel}
            <ChevronRight />
          </ActionButton>
        )}

        <SkipButton type="button" onClick={handleSkip}>
          {isEmailVerified
            ? allRewardsClaimed
              ? "계속하기"
              : "혜택은 나중에 받기"
            : "혜택은 나중에 받고 이메일 인증하기"}
        </SkipButton>
      </FooterActions>
    </Page>
  );
}
