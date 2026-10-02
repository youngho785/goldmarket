// src/components/OfficialAppBanner.jsx
// ==================================
// PWA 설치 배너가 아니라 Google Play의 "정식 Android 앱"만 안내합니다.
// 현재는 appDistribution.js의 released/promotionEnabled가 false라 화면에 나타나지 않습니다.

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { ANDROID_APP_DISTRIBUTION } from "@/config/appDistribution";
import { isWeb } from "@/platform/runtime";

const SNOOZE_KEY = "gm_official_android_app_snooze_until";

const Wrap = styled.aside`
  position: fixed;
  right: 12px;
  bottom: calc(92px + env(safe-area-inset-bottom, 0px));
  left: 12px;
  z-index: 10000;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  max-width: 720px;
  margin: 0 auto;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.hover};

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Copy = styled.div`
  display: grid;
  gap: 4px;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.98rem;
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.82rem;
    line-height: 1.5;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const Button = styled.button`
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 800;
  cursor: pointer;
`;

const Primary = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 13px;
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-weight: 850;
  text-decoration: none;
`;

function isAndroidBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function isSnoozed() {
  if (typeof window === "undefined") return true;

  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

export default function OfficialAppBanner() {
  const [visible, setVisible] = useState(false);

  const enabled = useMemo(() => {
    const { released, promotionEnabled, playStoreUrl } =
      ANDROID_APP_DISTRIBUTION;

    return Boolean(
      isWeb &&
        isAndroidBrowser() &&
        released &&
        promotionEnabled &&
        playStoreUrl
    );
  }, []);

  useEffect(() => {
    if (!enabled || isSnoozed()) return undefined;

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (!enabled || !visible) return null;

  const closeForDays = (days) => {
    try {
      const until =
        Date.now() + Number(days || 0) * 24 * 60 * 60 * 1000;
      localStorage.setItem(SNOOZE_KEY, String(until));
    } catch {}

    setVisible(false);
  };

  return (
    <Wrap aria-label="한국골드마켓 공식 앱 안내">
      <Copy>
        <strong>한국골드마켓 공식 앱이 출시되었습니다.</strong>
        <span>
          더 안정적인 알림과 편리한 이용을 위해 Google Play 공식 앱을
          권장합니다.
        </span>
      </Copy>

      <Actions>
        <Button type="button" onClick={() => closeForDays(7)}>
          나중에
        </Button>

        <Primary
          href={ANDROID_APP_DISTRIBUTION.playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => closeForDays(30)}
        >
          Google Play에서 설치
        </Primary>
      </Actions>
    </Wrap>
  );
}
