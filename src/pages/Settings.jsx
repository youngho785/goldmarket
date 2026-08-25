// src/pages/Settings.jsx
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  BellRing,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";

import { useAuthContext } from "../context/AuthContext";
import { isAndroid } from "../platform/runtime";
import {
  getCurrentNativeFcmToken,
  getNativePushPermission,
  requestNativePushPermission,
} from "../push/nativePush";
import {
  callDeleteMyAccount,
  registerForPush,
  unregisterPush,
} from "../firebase/firebase";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveMarketingNotificationConsent,
  saveMarketingPushTarget,
} from "../services/notificationPreferences";
import { claimMarketingPushGoldBonus } from "../services/quizClient";
import {
  collectPushDiagnostics,
  sendCurrentDevicePushTest,
} from "../services/pushDiagnostics";

/* ───────────── Styled ───────────── */
const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 0 32px;
  color: ${({ theme }) => theme.colors.text};
`;

const PageHeader = styled.div`
  margin-bottom: 22px;
`;

const Title = styled.h1`
  position: relative;
  margin: 0 0 10px;
  padding-bottom: 14px;
  color: ${({ theme }) => theme.colors.text};

  &::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    width: 50px;
    height: 3px;
    border-radius: 999px;
    background: ${({ theme }) => theme.gradients.gold};
  }
`;

const Intro = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.65;
`;

const Section = styled.section`
  margin-bottom: 18px;
  padding: clamp(20px, 4vw, 28px);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const SectionTitle = styled.h2`
  margin: 0 0 6px;
  font-size: clamp(1.15rem, 3vw, 1.4rem);
  color: ${({ theme }) => theme.colors.text};
`;

const SectionDescription = styled.p`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .88rem;
  line-height: 1.6;
`;

const Rows = styled.div`
  display: grid;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const RowText = styled.span`
  display: grid;
  gap: 4px;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: .96rem;
  }

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    line-height: 1.5;
  }

  em {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: .76rem;
    line-height: 1.45;
    font-style: normal;
  }
`;

const Switch = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 92px;
  height: 34px;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 7px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const SwitchOption = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : "transparent"};
  color: ${({ $active, theme }) =>
    $active ? theme.on.primary : theme.colors.textSecondary};
  font-size: .72rem;
  font-weight: 900;
  cursor: pointer;

  &:disabled {
    opacity: .5;
    cursor: not-allowed;
  }
`;

const Notice = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 12px;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .84rem;
  line-height: 1.55;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  padding: 9px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  svg {
    width: 17px;
    height: 17px;
  }
`;

const OutlineButton = styled(Button)`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
`;

const DangerButton = styled(Button)`
  border-color: ${({ theme }) => theme.colors.error};
  background: ${({ theme }) => theme.colors.error};
`;

const StatusGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin: 14px 0 0;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 9px 11px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  dt {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .78rem;
  }

  dd {
    margin: 0;
  }
`;

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ $tone, theme }) =>
    $tone === "ok"
      ? theme.semantic.alertSuccessBg
      : $tone === "error"
        ? theme.semantic.alertErrorBg
        : theme.semantic.alertWarningBg};
  color: ${({ $tone, theme }) =>
    $tone === "ok"
      ? theme.semantic.alertSuccessText
      : $tone === "error"
        ? theme.semantic.alertErrorText
        : theme.semantic.alertWarningText};
  font-size: .75rem;
  font-weight: 850;
  white-space: nowrap;
`;

const AdvancedDetails = styled.details`
  margin-top: 14px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};

  summary {
    padding: 13px 0;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
    font-weight: 800;
  }
`;

const AdvancedGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 14px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const AdvancedItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  dt {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .76rem;
  }

  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-size: .78rem;
    font-weight: 800;
    text-align: right;
  }
`;

const Message = styled.p`
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  color: ${({ $error, theme }) =>
    $error ? theme.semantic.alertErrorText : theme.semantic.alertSuccessText};
  background: ${({ $error, theme }) =>
    $error ? theme.semantic.alertErrorBg : theme.semantic.alertSuccessBg};
  line-height: 1.55;
`;

const Form = styled.form`
  display: grid;
  gap: 14px;
`;

const FormGroup = styled.div`
  display: grid;
  gap: 7px;
`;

const Label = styled.label`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 750;
`;

const Input = styled.input`
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
`;

const LinkList = styled.div`
  display: grid;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const SettingLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-weight: 750;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const Help = styled.div`
  display: grid;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};

  ol {
    display: grid;
    gap: 5px;
    margin: 0;
    padding-left: 20px;
  }
`;

const DangerNote = styled.p`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.65;
`;

const NotificationSummary = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  margin-top: 14px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  > div {
    display: grid;
    gap: 5px;
  }

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: .96rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
    line-height: 1.55;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const TroubleshootDetails = styled.details`
  margin-top: 14px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};

  > summary {
    position: relative;
    padding: 14px 24px 14px 0;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .88rem;
    font-weight: 850;
    list-style: none;
  }

  > summary::-webkit-details-marker {
    display: none;
  }

  > summary::after {
    content: "›";
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 1.2rem;
    transition: transform .16s ease;
  }

  &[open] > summary::after {
    transform: translateY(-50%) rotate(90deg);
  }
`;

const SettingDetails = styled.details`
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  > summary {
    position: relative;
    display: grid;
    gap: 4px;
    padding: 16px 30px 16px 0;
    cursor: pointer;
    list-style: none;
  }

  > summary::-webkit-details-marker {
    display: none;
  }

  > summary strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: .96rem;
  }

  > summary small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    line-height: 1.5;
  }

  > summary::after {
    content: "›";
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 1.25rem;
    transition: transform .16s ease;
  }

  &[open] > summary::after {
    transform: translateY(-50%) rotate(90deg);
  }
`;

const DetailsBody = styled.div`
  display: grid;
  gap: 14px;
  padding: 2px 0 18px;
`;

const DangerDetails = styled(SettingDetails)`
  > summary strong {
    color: ${({ theme }) => theme.colors.error};
  }
`;

/* ───────────── Utils ───────────── */
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

function getNotificationPermissionHelp(browserName) {
  if (browserName === "삼성인터넷") {
    return [
      "삼성인터넷의 설정을 엽니다.",
      "사이트 권한 또는 알림 설정에서 한국골드마켓을 찾습니다.",
      "알림을 허용으로 변경한 뒤 이 페이지로 돌아옵니다.",
    ];
  }

  if (browserName === "Chrome") {
    return [
      "Chrome의 설정을 엽니다.",
      "사이트 설정 또는 알림 설정에서 한국골드마켓을 찾습니다.",
      "알림을 허용으로 변경한 뒤 이 페이지로 돌아옵니다.",
    ];
  }

  return [
    "현재 브라우저의 설정을 엽니다.",
    "사이트 권한 또는 알림 설정에서 한국골드마켓을 찾습니다.",
    "알림을 허용으로 변경한 뒤 이 페이지로 돌아옵니다.",
  ];
}

function normalizeNativeNotificationPermission(value) {
  if (value === "granted") return "granted";
  if (value === "denied") return "denied";

  if (
    value === "prompt" ||
    value === "prompt-with-rationale"
  ) {
    return "default";
  }

  return "unsupported";
}

function notificationPermissionLabel(value) {
  if (value === "granted") return "허용됨";
  if (value === "denied") return "차단됨";
  if (value === "default") return "허용 필요";
  return "지원 안 함";
}

function serviceWorkerStateLabel(value) {
  if (value === "activated") return "정상 작동";
  if (value === "activating") return "활성화 중";
  if (value === "installed" || value === "waiting") return "업데이트 대기";
  if (value === "installing") return "설치 중";
  if (value === "redundant") return "오류";
  return "등록 안 됨";
}

function validateNewPassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) {
    return "비밀번호는 최소 8자 이상이어야 합니다.";
  }

  if (
    !/[A-Za-z]/.test(pw) ||
    !/\d/.test(pw) ||
    !/[!@#$%^&*()_+{};':",.<>/?\\|`~-]/.test(pw)
  ) {
    return "영문/숫자/특수문자를 모두 포함해야 합니다.";
  }

  return "";
}

const APP_BUSY_KEY = "__app_busy__";

/* ───────────── Page ───────────── */
export default function Settings() {
  const { user, changePassword } = useAuthContext();
  const auth = getAuth();
  const navigate = useNavigate();
  const currentBrowserName = detectBrowserName();

  const currentDeviceName = isAndroid
    ? "한국골드마켓 앱"
    : currentBrowserName;

  const [notificationPrefs, setNotificationPrefs] = useState(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  const [notificationPrefsLoading, setNotificationPrefsLoading] =
    useState(true);

  const [notificationPrefsSaving, setNotificationPrefsSaving] =
    useState(false);

  const [notificationPrefsMessage, setNotificationPrefsMessage] =
    useState("");

  const [notificationPrefsError, setNotificationPrefsError] =
    useState("");

  const [notificationHelpOpen, setNotificationHelpOpen] =
    useState(false);

  const [currentDeviceFcmToken, setCurrentDeviceFcmToken] =
    useState(() => {
      if (isAndroid) {
        return getCurrentNativeFcmToken();
      }

      if (typeof window === "undefined") return "";

      try {
        return (
          window.localStorage.getItem("fcmToken") || ""
        );
      } catch {
        return "";
      }
    });

  const [notificationPermission, setNotificationPermission] =
    useState(() => {
      if (isAndroid) {
        return "default";
      }

      if (
        typeof window === "undefined" ||
        !("Notification" in window)
      ) {
        return "unsupported";
      }

      return (
        window.Notification.permission || "default"
      );
    });

  const [pushDiagnostics, setPushDiagnostics] =
    useState(null);

  const [pushDiagnosticsLoading, setPushDiagnosticsLoading] =
    useState(false);

  const [pushTestSending, setPushTestSending] =
    useState(false);

  const [pushDiagnosticsMessage, setPushDiagnosticsMessage] =
    useState("");

  const [pushDiagnosticsError, setPushDiagnosticsError] =
    useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [pwdMessage, setPwdMessage] =
    useState("");

  const [pwdError, setPwdError] =
    useState("");

  const [changingPwd, setChangingPwd] =
    useState(false);

  const [deletePwd, setDeletePwd] =
    useState("");

  const [deleteAgree, setDeleteAgree] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [deleteMsg, setDeleteMsg] =
    useState("");

  const [deleteErr, setDeleteErr] =
    useState("");

  /*
   * 알림 설정 불러오기
   */
  useEffect(() => {
    let cancelled = false;

    if (!user?.uid) {
      setNotificationPrefsLoading(false);

      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setNotificationPrefsLoading(true);

      try {
        const prefs =
          await getNotificationPreferences(
            user.uid
          );

        if (!cancelled) {
          setNotificationPrefs(prefs);

          // 기능 출시 전에 이미 금시세·혜택 알림을 정상 설정한 회원도
          // 설정 화면을 열면 계정당 1회 혜택을 확인합니다.
          if (
            prefs?.marketingNotificationsEnabled === true &&
            prefs?.marketingFcmToken
          ) {
            claimMarketingPushGoldBonus().catch(
              (bonusError) => {
                console.warn(
                  "[settings] existing marketing bonus claim failed:",
                  bonusError
                );
              }
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setNotificationPrefsError(
            `알림 설정을 불러오지 못했습니다: ${
              error?.message || error
            }`
          );
        }
      } finally {
        if (!cancelled) {
          setNotificationPrefsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  /*
   * 현재 기기 알림 권한 동기화
   *
   * Android:
   *   Capacitor Native Push 권한 사용
   *
   * Web/PWA:
   *   window.Notification 사용
   */
  useEffect(() => {
    let cancelled = false;

    if (isAndroid) {
      const syncNativeNotificationPermission =
        async () => {
          const nativePermission =
            await getNativePushPermission();

          if (cancelled) return;

          const next =
            normalizeNativeNotificationPermission(
              nativePermission
            );

          setNotificationPermission(next);

          setCurrentDeviceFcmToken(
            getCurrentNativeFcmToken()
          );

          if (next === "granted") {
            setNotificationHelpOpen(false);
          }
        };

      const onVisible = () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          syncNativeNotificationPermission();
        }
      };

      syncNativeNotificationPermission();

      window.addEventListener(
        "focus",
        syncNativeNotificationPermission
      );

      window.addEventListener(
        "pageshow",
        syncNativeNotificationPermission
      );

      document.addEventListener(
        "visibilitychange",
        onVisible
      );

      return () => {
        cancelled = true;

        window.removeEventListener(
          "focus",
          syncNativeNotificationPermission
        );

        window.removeEventListener(
          "pageshow",
          syncNativeNotificationPermission
        );

        document.removeEventListener(
          "visibilitychange",
          onVisible
        );
      };
    }

    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return undefined;
    }

    const syncNotificationPermission = () => {
      const next =
        window.Notification.permission ||
        "default";

      setNotificationPermission(next);

      try {
        setCurrentDeviceFcmToken(
          window.localStorage.getItem(
            "fcmToken"
          ) || ""
        );
      } catch {
        setCurrentDeviceFcmToken("");
      }

      if (next === "granted") {
        setNotificationHelpOpen(false);
      }
    };

    const onVisible = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        syncNotificationPermission();
      }
    };

    window.addEventListener(
      "focus",
      syncNotificationPermission
    );

    window.addEventListener(
      "pageshow",
      syncNotificationPermission
    );

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener(
        "focus",
        syncNotificationPermission
      );

      window.removeEventListener(
        "pageshow",
        syncNotificationPermission
      );

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  /*
   * 알림 진단
   */
  const refreshPushDiagnostics =
    useCallback(
      async ({ announce = false } = {}) => {
        if (!user?.uid) return null;

        setPushDiagnosticsLoading(true);
        setPushDiagnosticsError("");

        try {
          /*
           * Android Native
           */
          if (isAndroid) {
            const nativePermission =
              await getNativePushPermission();

            const permission =
              normalizeNativeNotificationPermission(
                nativePermission
              );

            const token =
              getCurrentNativeFcmToken();

            let tokenUid = "";

            try {
              tokenUid =
                window.localStorage.getItem(
                  "nativeFcmTokenUid"
                ) || "";
            } catch {
              tokenUid = "";
            }

            /*
             * nativeFcmTokenUid는
             * Firestore 저장 성공 후에만 기록되므로
             * 현재 회원과의 연결 상태 확인에 사용합니다.
             */
            const tokenMatchesUser =
              !!token &&
              tokenUid === user.uid;

            const next = {
              native: true,
              platform: "Android",
              standalone: true,
              isIOS: false,

              notificationSupported: true,
              notificationPermission:
                permission,

              tokenPresent: !!token,
              tokenMatchesUser,

              tokenRegistrationHealthy:
                permission === "granted" &&
                tokenMatchesUser,

              firestoreRegistrationChecked:
                tokenMatchesUser,

              firestoreTokenRegistered:
                tokenMatchesUser,

              firestoreRegistrationError: "",

              /*
               * Native 앱에서는
               * 서비스워커가 필요하지 않습니다.
               */
              serviceWorkerReady: false,
              serviceWorkerState: "native",

              messagingSupported: true,
              secureContext: true,
              pushManagerSupported: false,
            };

            setPushDiagnostics(next);

            setNotificationPermission(
              permission
            );

            setCurrentDeviceFcmToken(
              token
            );

            if (announce) {
              setPushDiagnosticsMessage(
                "현재 앱의 알림 상태를 다시 확인했습니다."
              );
            }

            return next;
          }

          /*
           * Web / PWA
           */
          const next =
            await collectPushDiagnostics(
              user.uid
            );

          setPushDiagnostics(next);

          setNotificationPermission(
            next.notificationPermission
          );

          if (announce) {
            setPushDiagnosticsMessage(
              "현재 기기의 알림 상태를 다시 확인했습니다."
            );
          }

          return next;
        } catch (error) {
          setPushDiagnosticsError(
            error?.message ||
              "알림 상태를 확인하지 못했습니다."
          );

          return null;
        } finally {
          setPushDiagnosticsLoading(false);
        }
      },
      [user?.uid]
    );

  useEffect(() => {
    if (!user?.uid) {
      setPushDiagnostics(null);
      return;
    }

    refreshPushDiagnostics();
  }, [
    refreshPushDiagnostics,
    user?.uid,
  ]);

  useEffect(() => {
    if (!notificationPrefsMessage) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => {
        setNotificationPrefsMessage("");
      },
      3000
    );

    return () =>
      window.clearTimeout(timer);
  }, [notificationPrefsMessage]);

  /*
   * 현재 기기 Push 등록
   */
  const registerCurrentDevicePush =
    async () => {
      if (!user?.uid) return null;

      try {
        /*
         * Android Native
         */
        if (isAndroid) {
          const result =
            await requestNativePushPermission(
              user.uid
            );

          const permission =
            normalizeNativeNotificationPermission(
              result?.permission
            );

          setNotificationPermission(
            permission
          );

          const token =
            result?.token ||
            getCurrentNativeFcmToken();

          if (!token) {
            return null;
          }

          setCurrentDeviceFcmToken(
            token
          );

          return token;
        }

        /*
         * Web / PWA
         */
        const token =
          await registerForPush(
            user.uid
          );

        if (!token) {
          return null;
        }

        setCurrentDeviceFcmToken(
          token
        );

        try {
          window.dispatchEvent(
            new Event(
              "PUSH_PERMISSION_GRANTED"
            )
          );
        } catch {}

        return token;
      } catch (error) {
        console.warn(
          "[settings] 기기 푸시 등록 실패:",
          error
        );

        return null;
      }
    };

  /*
   * 현재 기기를
   * 금시세·혜택 대표 수신 기기로 지정
   */
  const selectCurrentDeviceForMarketing =
    async () => {
      if (!user?.uid) return null;

      const token =
        await registerCurrentDevicePush();

      if (!token) {
        return null;
      }

      const savedTarget =
        await saveMarketingPushTarget(
          user.uid,
          token,
          currentDeviceName
        );

      setNotificationPrefs(
        (current) => ({
          ...current,
          ...(savedTarget || {}),
          marketingFcmToken:
            token,
          marketingFcmBrowser:
            currentDeviceName,
          marketingPushConfigured:
            true,
        })
      );

      return token;
    };

  /*
   * 금시세·혜택 알림 ON/OFF
   */
  const handleMarketingNotificationSet =
    async (nextEnabled) => {
      if (
        !user?.uid ||
        notificationPrefsSaving
      ) {
        return;
      }

      const currentEnabled =
        notificationPrefs
          .marketingNotificationsEnabled ===
        true;

      if (
        currentEnabled === nextEnabled
      ) {
        return;
      }

      const previous =
        notificationPrefs;

      setNotificationPrefs(
        (current) => ({
          ...current,
          marketingNotificationsEnabled:
            nextEnabled,
        })
      );

      setNotificationPrefsSaving(true);
      setNotificationPrefsMessage("");
      setNotificationPrefsError("");

      try {
        let permission =
          "unsupported";

        /*
         * Android Native
         */
        if (isAndroid) {
          permission =
            normalizeNativeNotificationPermission(
              await getNativePushPermission()
            );

          /*
           * 사용자가 ON을 직접 눌렀을 때만
           * Android 알림 권한 요청창을 띄웁니다.
           */
          if (
            nextEnabled &&
            permission === "default"
          ) {
            const result =
              await requestNativePushPermission(
                user.uid
              );

            permission =
              normalizeNativeNotificationPermission(
                result?.permission
              );

            const token =
              result?.token ||
              getCurrentNativeFcmToken();

            if (token) {
              setCurrentDeviceFcmToken(
                token
              );
            }
          }
        } else {
          /*
           * Web / PWA
           */
          permission =
            typeof window !==
              "undefined" &&
            "Notification" in window
              ? window.Notification
                  .permission
              : "unsupported";

          if (
            nextEnabled &&
            permission === "default"
          ) {
            try {
              permission =
                await window.Notification
                  .requestPermission();
            } catch (error) {
              console.warn(
                "[settings] 알림 권한 요청 실패:",
                error
              );

              permission =
                typeof window !==
                  "undefined" &&
                "Notification" in window
                  ? window.Notification
                      .permission ||
                    "default"
                  : "unsupported";
            }
          }
        }

        setNotificationPermission(
          permission
        );

        if (
          permission === "granted"
        ) {
          setNotificationHelpOpen(
            false
          );
        } else if (
          permission === "denied"
        ) {
          setNotificationHelpOpen(
            true
          );
        }

        /*
         * 광고성 정보 수신동의 저장
         */
        const saved =
          await saveMarketingNotificationConsent(
            user.uid,
            nextEnabled
          );

        setNotificationPrefs(
          (current) => ({
            ...current,
            ...(saved || {}),
            marketingNotificationsEnabled:
              nextEnabled,
          })
        );

        if (!nextEnabled) {
          setNotificationPrefsMessage(
            ""
          );
          return;
        }

        /*
         * 알림 권한이 있으면
         * 현재 기기를 대표 수신 기기로 연결합니다.
         */
        if (
          permission === "granted"
        ) {
          const token =
            await selectCurrentDeviceForMarketing();

          if (token) {
            setNotificationPrefsMessage(
              `${currentDeviceName}에서 금시세·혜택 알림을 받도록 설정했습니다.`
            );
          } else {
            setNotificationPrefsError(
              "금시세·혜택 알림은 켰지만 이 기기의 푸시 등록을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요."
            );
          }
        } else {
          setNotificationPrefsMessage(
            "금시세·혜택 알림을 켰습니다."
          );
        }
      } catch (error) {
        setNotificationPrefs(
          previous
        );

        setNotificationPrefsError(
          `알림 설정 처리 중 오류가 발생했습니다: ${
            error?.message || error
          }`
        );
      } finally {
        setNotificationPrefsSaving(
          false
        );
      }
    };

  /*
   * 알림 허용하기
   */
  const requestNotificationPermission =
    async () => {
      if (
        !user?.uid ||
        notificationPrefsSaving
      ) {
        return;
      }

      setNotificationPrefsSaving(true);
      setNotificationPrefsMessage("");
      setNotificationPrefsError("");

      try {
        /*
         * Android Native
         */
        if (isAndroid) {
          const result =
            await requestNativePushPermission(
              user.uid
            );

          const permission =
            normalizeNativeNotificationPermission(
              result?.permission
            );

          setNotificationPermission(
            permission
          );

          const token =
            result?.token ||
            getCurrentNativeFcmToken();

          if (token) {
            setCurrentDeviceFcmToken(
              token
            );
          }

          if (
            permission === "granted"
          ) {
            setNotificationHelpOpen(
              false
            );

            if (!token) {
              setNotificationPrefsError(
                "알림 권한은 허용됐지만 앱 푸시 등록을 완료하지 못했습니다."
              );

              return;
            }

            /*
             * 금시세·혜택 동의가 이미 ON인데
             * 대표 수신 토큰이 없는 경우
             * 현재 Android 앱을 자동 지정합니다.
             */
            if (
              notificationPrefs
                .marketingNotificationsEnabled ===
                true &&
              !notificationPrefs
                .marketingFcmToken
            ) {
              try {
                const savedTarget =
                  await saveMarketingPushTarget(
                    user.uid,
                    token,
                    currentDeviceName
                  );

                setNotificationPrefs(
                  (current) => ({
                    ...current,
                    ...(savedTarget || {}),
                  })
                );
              } catch (error) {
                console.warn(
                  "[settings] 금시세·혜택 대표 앱 자동 지정 실패:",
                  error
                );
              }
            }

            setNotificationPrefsMessage(
              "한국골드마켓 앱 알림을 허용했습니다."
            );

            await refreshPushDiagnostics();
          } else if (
            permission === "denied"
          ) {
            setNotificationHelpOpen(
              true
            );
          } else {
            setNotificationPrefsMessage(
              "알림 허용이 아직 완료되지 않았습니다."
            );
          }

          return;
        }

        /*
         * Web / PWA
         */
        if (
          typeof window ===
            "undefined" ||
          !("Notification" in window)
        ) {
          setNotificationPermission(
            "unsupported"
          );

          setNotificationPrefsError(
            "이 브라우저는 웹 알림을 지원하지 않습니다."
          );

          return;
        }

        let permission =
          window.Notification.permission;

        if (
          permission === "denied"
        ) {
          setNotificationPermission(
            "denied"
          );

          setNotificationHelpOpen(
            true
          );

          return;
        }

        if (
          permission === "default"
        ) {
          permission =
            await window.Notification
              .requestPermission();
        }

        setNotificationPermission(
          permission
        );

        if (
          permission === "granted"
        ) {
          setNotificationHelpOpen(
            false
          );

          const token =
            await registerCurrentDevicePush();

          if (token) {
            if (
              notificationPrefs
                .marketingNotificationsEnabled ===
                true &&
              !notificationPrefs
                .marketingFcmToken
            ) {
              try {
                const savedTarget =
                  await saveMarketingPushTarget(
                    user.uid,
                    token,
                    currentDeviceName
                  );

                setNotificationPrefs(
                  (current) => ({
                    ...current,
                    ...(savedTarget || {}),
                  })
                );
              } catch (error) {
                console.warn(
                  "[settings] 금시세·혜택 대표 브라우저 자동 지정 실패:",
                  error
                );
              }
            }

            setNotificationPrefsMessage(
              "휴대폰 알림을 허용했습니다."
            );

            await refreshPushDiagnostics();
          } else {
            setNotificationPrefsError(
              "알림 권한은 허용됐지만 푸시 등록을 완료하지 못했습니다."
            );
          }
        } else if (
          permission === "denied"
        ) {
          setNotificationHelpOpen(
            true
          );
        } else {
          setNotificationPrefsMessage(
            "알림 허용이 아직 완료되지 않았습니다."
          );
        }
      } catch (error) {
        setNotificationPrefsError(
          `알림 권한 요청 중 오류가 발생했습니다: ${
            error?.message || error
          }`
        );
      } finally {
        setNotificationPrefsSaving(
          false
        );
      }
    };

  /*
   * 이 기기를 금시세·혜택
   * 대표 수신 기기로 지정
   */
  const handleUseThisDeviceForMarketing =
    async () => {
      if (
        !user?.uid ||
        notificationPrefsSaving ||
        notificationPrefs
          .marketingNotificationsEnabled !==
          true
      ) {
        return;
      }

      setNotificationPrefsSaving(true);
      setNotificationPrefsMessage("");
      setNotificationPrefsError("");

      try {
        /*
         * Android Native
         */
        if (isAndroid) {
          const token =
            await selectCurrentDeviceForMarketing();

          const permission =
            normalizeNativeNotificationPermission(
              await getNativePushPermission()
            );

          setNotificationPermission(
            permission
          );

          if (
            permission === "denied"
          ) {
            setNotificationHelpOpen(
              true
            );
            return;
          }

          if (
            permission !== "granted"
          ) {
            setNotificationPrefsError(
              "한국골드마켓 앱의 알림 허용이 완료되지 않았습니다."
            );
            return;
          }

          if (!token) {
            setNotificationPrefsError(
              "이 앱을 금시세·혜택 알림 수신 기기로 등록하지 못했습니다."
            );
            return;
          }

          setNotificationHelpOpen(
            false
          );

          setNotificationPrefsMessage(
            "금시세·혜택 알림을 한국골드마켓 앱에서 받도록 변경했습니다."
          );

          await refreshPushDiagnostics();

          return;
        }

        /*
         * Web / PWA
         */
        if (
          typeof window ===
            "undefined" ||
          !("Notification" in window)
        ) {
          setNotificationPermission(
            "unsupported"
          );

          setNotificationPrefsError(
            "이 브라우저에서는 휴대폰 알림을 사용할 수 없습니다."
          );

          return;
        }

        let permission =
          window.Notification.permission;

        if (
          permission === "default"
        ) {
          permission =
            await window.Notification
              .requestPermission();
        }

        setNotificationPermission(
          permission
        );

        if (
          permission === "denied"
        ) {
          setNotificationHelpOpen(
            true
          );
          return;
        }

        if (
          permission !== "granted"
        ) {
          setNotificationPrefsError(
            "이 브라우저의 알림 허용이 완료되지 않았습니다."
          );
          return;
        }

        setNotificationHelpOpen(
          false
        );

        const token =
          await selectCurrentDeviceForMarketing();

        if (!token) {
          setNotificationPrefsError(
            "이 브라우저를 금시세·혜택 알림 수신 브라우저로 등록하지 못했습니다."
          );
          return;
        }

        setNotificationPrefsMessage(
          `금시세·혜택 알림 수신 브라우저를 ${currentBrowserName}(으)로 변경했습니다.`
        );

        await refreshPushDiagnostics();
      } catch (error) {
        setNotificationPrefsError(
          `알림 수신 기기 변경 중 오류가 발생했습니다: ${
            error?.message || error
          }`
        );
      } finally {
        setNotificationPrefsSaving(
          false
        );
      }
    };

  /*
   * 시험 알림
   */
  const handleSendPushTest =
    async () => {
      if (
        !user?.uid ||
        pushTestSending
      ) {
        return;
      }

      setPushTestSending(true);
      setPushDiagnosticsMessage("");
      setPushDiagnosticsError("");

      try {
        /*
         * Android Native
         */
        if (isAndroid) {
          let permission =
            normalizeNativeNotificationPermission(
              await getNativePushPermission()
            );

          if (
            permission === "denied"
          ) {
            setNotificationPermission(
              "denied"
            );

            setNotificationHelpOpen(
              true
            );

            throw new Error(
              "한국골드마켓 앱 알림이 차단되어 있습니다."
            );
          }

          const token =
            await registerCurrentDevicePush();

          permission =
            normalizeNativeNotificationPermission(
              await getNativePushPermission()
            );

          setNotificationPermission(
            permission
          );

          if (
            permission !== "granted"
          ) {
            if (
              permission === "denied"
            ) {
              setNotificationHelpOpen(
                true
              );
            }

            throw new Error(
              "알림 권한을 허용한 뒤 시험 알림을 보낼 수 있습니다."
            );
          }

          if (!token) {
            throw new Error(
              "현재 앱의 푸시 토큰을 등록하지 못했습니다. 네트워크 상태를 확인해 주세요."
            );
          }

          const result =
            await sendCurrentDevicePushTest(
              token
            );

          if (!result?.ok) {
            throw new Error(
              "시험 알림 발송 결과를 확인할 수 없습니다."
            );
          }

          setPushDiagnosticsMessage(
            "시험 알림을 보냈습니다. 잠시 후 휴대폰 알림을 확인해 주세요."
          );

          await refreshPushDiagnostics();

          return;
        }

        /*
         * Web / PWA
         */
        const diagnostic =
          pushDiagnostics ||
          (await refreshPushDiagnostics());

        if (
          !diagnostic?.notificationSupported
        ) {
          throw new Error(
            "이 브라우저에서는 시스템 알림을 사용할 수 없습니다."
          );
        }

        if (
          diagnostic.isIOS &&
          !diagnostic.standalone
        ) {
          throw new Error(
            "iPhone·iPad에서는 먼저 홈 화면에 설치한 한국골드마켓 앱으로 실행해 주세요."
          );
        }

        let permission =
          window.Notification.permission;

        if (
          permission === "default"
        ) {
          permission =
            await window.Notification
              .requestPermission();
        }

        setNotificationPermission(
          permission
        );

        if (
          permission !== "granted"
        ) {
          if (
            permission === "denied"
          ) {
            setNotificationHelpOpen(
              true
            );
          }

          throw new Error(
            "알림 권한을 허용한 뒤 시험 알림을 보낼 수 있습니다."
          );
        }

        const token =
          await registerCurrentDevicePush();

        if (!token) {
          throw new Error(
            "현재 기기의 푸시 토큰을 등록하지 못했습니다. 네트워크 상태를 확인해 주세요."
          );
        }

        const result =
          await sendCurrentDevicePushTest(
            token
          );

        if (!result?.ok) {
          throw new Error(
            "시험 알림 발송 결과를 확인할 수 없습니다."
          );
        }

        setPushDiagnosticsMessage(
          "시험 알림을 보냈습니다. 잠시 후 휴대폰 상단 알림을 확인해 주세요."
        );

        await refreshPushDiagnostics();
      } catch (error) {
        const errorMessage =
          error?.message ||
          "시험 알림을 보내지 못했습니다.";

        /*
         * Web Push의 만료 토큰 정리는
         * 기존 로직을 그대로 유지합니다.
         *
         * Android Native 토큰은
         * 여기서 Web unregisterPush()로 지우지 않습니다.
         */
        if (
          !isAndroid &&
          error?.details?.reason ===
            "token-expired"
        ) {
          try {
            await unregisterPush(
              user.uid
            );

            setCurrentDeviceFcmToken(
              ""
            );
          } catch {}
        }

        await refreshPushDiagnostics();

        setPushDiagnosticsError(
          errorMessage
        );
      } finally {
        setPushTestSending(false);
      }
    };

  /*
   * 비밀번호 변경
   */
  const handlePasswordSubmit =
    async (event) => {
      event.preventDefault();

      setPwdError("");
      setPwdMessage("");

      if (
        !currentPassword ||
        !newPassword
      ) {
        setPwdError(
          "현재 비밀번호와 새 비밀번호를 모두 입력해주세요."
        );
        return;
      }

      const validationMessage =
        validateNewPassword(
          newPassword
        );

      if (validationMessage) {
        setPwdError(
          validationMessage
        );
        return;
      }

      if (
        currentPassword === newPassword
      ) {
        setPwdError(
          "새 비밀번호가 현재 비밀번호와 동일합니다."
        );
        return;
      }

      setChangingPwd(true);

      try {
        const credential =
          EmailAuthProvider.credential(
            user.email,
            currentPassword
          );

        await reauthenticateWithCredential(
          auth.currentUser,
          credential
        );

        await changePassword(
          newPassword
        );

        setPwdMessage(
          "비밀번호가 성공적으로 변경되었습니다."
        );

        setCurrentPassword("");
        setNewPassword("");
      } catch (error) {
        switch (error?.code) {
          case "auth/wrong-password":
            setPwdError(
              "현재 비밀번호가 올바르지 않습니다."
            );
            break;

          case "auth/weak-password":
            setPwdError(
              "새 비밀번호가 너무 약합니다. 8자 이상이며, 영문/숫자/특수문자를 포함해야 합니다."
            );
            break;

          case "auth/too-many-requests":
            setPwdError(
              "비밀번호 변경 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."
            );
            break;

          default:
            setPwdError(
              `오류가 발생했습니다: ${
                error?.message || error
              }`
            );
        }
      } finally {
        setChangingPwd(false);
      }
    };

  /*
   * 계정 탈퇴
   *
   * 로그아웃과 달리 계정 탈퇴는
   * 알림 대상도 함께 제거합니다.
   */
  const handleDeleteAccount =
    async (event) => {
      event.preventDefault();

      setDeleteErr("");
      setDeleteMsg("");

      if (!deleteAgree) {
        setDeleteErr(
          "탈퇴 안내를 확인하고 동의해 주세요."
        );
        return;
      }

      if (!deletePwd) {
        setDeleteErr(
          "보안을 위해 현재 비밀번호를 입력해 주세요."
        );
        return;
      }

      if (
        !window.confirm(
          "한국골드마켓 계정을 영구 삭제할까요?"
        )
      ) {
        return;
      }

      setDeleting(true);

      try {
        sessionStorage.setItem(
          APP_BUSY_KEY,
          "1"
        );
      } catch {}

      try {
        const credential =
          EmailAuthProvider.credential(
            user.email,
            deletePwd
          );

        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("로그인 상태를 확인할 수 없습니다. 다시 로그인해 주세요.");
        }

        await reauthenticateWithCredential(
          currentUser,
          credential
        );

        // 재인증된 auth_time이 포함된 최신 ID 토큰을 callable이 사용하도록 강제합니다.
        await currentUser.getIdToken(true);

        /*
         * Web/PWA는 기존 Web Push 구독 정리
         *
         * Android는 계정 탈퇴 서버가
         * users/{uid}.fcmTokens를 비우므로
         * Web unregisterPush()를 호출하지 않습니다.
         */
        if (!isAndroid) {
          try {
            await unregisterPush(
              user.uid
            );
          } catch {}
        }

        const result =
          await callDeleteMyAccount();

        if (!result?.ok) {
          throw new Error(
            "계정 탈퇴 처리 결과를 확인할 수 없습니다."
          );
        }

        try {
          await signOut(auth);
        } catch {
          // 서버에서 계정이 이미 삭제됐을 수 있으므로 무시
        }

        /*
         * 탈퇴인 경우에만
         * Web / Native 로컬 토큰 기록을 정리합니다.
         *
         * 일반 로그아웃에서는 제거하지 않습니다.
         */
        try {
          localStorage.removeItem(
            "fcmToken"
          );

          localStorage.removeItem(
            "fcmTokenUid"
          );

          localStorage.removeItem(
            "fcmTokenRegisteredAt"
          );

          localStorage.removeItem(
            "nativeFcmToken"
          );

          localStorage.removeItem(
            "nativeFcmTokenUid"
          );

          localStorage.removeItem(
            "nativeFcmTokenRegisteredAt"
          );
        } catch {}

        setDeleteMsg(
          "계정이 삭제되었습니다. 그동안 이용해 주셔서 감사합니다."
        );

        window.setTimeout(() => {
          try {
            sessionStorage.removeItem(
              APP_BUSY_KEY
            );
          } catch {}

          navigate("/", {
            replace: true,
          });
        }, 1000);
      } catch (error) {
        const errorCode = String(
          error?.code || ""
        );
        const functionsCode =
          errorCode.startsWith("functions/")
            ? errorCode.slice("functions/".length)
            : errorCode;

        if (
          errorCode === "auth/wrong-password" ||
          errorCode === "auth/invalid-credential"
        ) {
          setDeleteErr(
            "현재 비밀번호가 올바르지 않습니다."
          );
        } else if (
          errorCode ===
          "auth/too-many-requests"
        ) {
          setDeleteErr(
            "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
          );
        } else if (
          functionsCode ===
          "failed-precondition"
        ) {
          setDeleteErr(
            "보안을 위해 비밀번호를 다시 확인해 주세요."
          );
        } else {
          setDeleteErr(
            `탈퇴 처리 중 오류: ${
              error?.message || error
            }`
          );
        }

        try {
          sessionStorage.removeItem(
            APP_BUSY_KEY
          );
        } catch {}
      } finally {
        setDeleting(false);
      }
    };

  if (!user) {
    return (
      <Container>
        <Title>
          로그인이 필요합니다
        </Title>

        <SettingLink to="/login">
          로그인하러 가기
        </SettingLink>
      </Container>
    );
  }

  /*
   * 현재 금시세·혜택 대표 수신 기기인지 확인
   */
  const isCurrentMarketingDevice =
    notificationPrefs
      .marketingNotificationsEnabled ===
      true &&
    !!notificationPrefs
      .marketingFcmToken &&
    !!currentDeviceFcmToken &&
    notificationPrefs
      .marketingFcmToken ===
      currentDeviceFcmToken;

  /*
   * 전체 Push 준비 상태
   */
  const pushReady = isAndroid
    ? pushDiagnostics
        ?.notificationPermission ===
        "granted" &&
      pushDiagnostics
        ?.tokenRegistrationHealthy ===
        true
    : pushDiagnostics
        ?.notificationPermission ===
        "granted" &&
      pushDiagnostics
        ?.serviceWorkerReady ===
        true &&
      pushDiagnostics
        ?.messagingSupported ===
        true &&
      pushDiagnostics
        ?.tokenRegistrationHealthy ===
        true;

  return (
    <Container>
      <PageHeader>
        <Title>설정</Title>

        <Intro>
          알림, 앱, 보안과 계정 설정을 한곳에서 관리합니다.
        </Intro>
      </PageHeader>

      {/* ───────────── 알림 ───────────── */}
      <Section aria-labelledby="settings-notifications-title">
        <SectionTitle id="settings-notifications-title">
          알림
        </SectionTitle>

        <SectionDescription>
          꼭 필요한 서비스 안내와 선택한 금시세·혜택 알림을 관리합니다.
        </SectionDescription>

        <Rows
          aria-busy={
            notificationPrefsLoading ||
            notificationPrefsSaving
          }
        >
          <Row>
            <RowText>
              <strong>
                예약·교환 진행 안내
              </strong>

              <small>
                예약 접수, 승인, 일정 변경,
                진행 및 교환 완료 등 서비스
                이용에 필요한 안내입니다.
              </small>
            </RowText>

            <Status $tone="ok">
              자동 안내
            </Status>
          </Row>

          <Row>
            <RowText>
              <strong>
                내 금의 가치 변화·혜택 알림
              </strong>

              <small>
                금시세 주요 변동과 한국골드마켓
                소식·혜택을 선택해서 받아봅니다.
              </small>

              <em>
                선택 동의 · 신규회원은 설정 완료 시 계정당 1회 순금 0.01g 혜택
              </em>
            </RowText>

            <Switch
              role="group"
              aria-label="내 금의 가치 변화·혜택 알림 설정"
            >
              <SwitchOption
                type="button"
                $active={
                  notificationPrefs
                    .marketingNotificationsEnabled ===
                  true
                }
                disabled={
                  notificationPrefsLoading ||
                  notificationPrefsSaving
                }
                onClick={() =>
                  handleMarketingNotificationSet(
                    true
                  )
                }
                aria-pressed={
                  notificationPrefs
                    .marketingNotificationsEnabled ===
                  true
                }
              >
                ON
              </SwitchOption>

              <SwitchOption
                type="button"
                $active={
                  notificationPrefs
                    .marketingNotificationsEnabled !==
                  true
                }
                disabled={
                  notificationPrefsLoading ||
                  notificationPrefsSaving
                }
                onClick={() =>
                  handleMarketingNotificationSet(
                    false
                  )
                }
                aria-pressed={
                  notificationPrefs
                    .marketingNotificationsEnabled !==
                  true
                }
              >
                OFF
              </SwitchOption>
            </Switch>
          </Row>
        </Rows>

        {!notificationPrefsLoading &&
          notificationPrefs
            .marketingNotificationsEnabled ===
            true && (
            <Notice aria-live="polite">
              <strong>
                금시세·혜택 알림을 받을 기기
              </strong>

              {notificationPrefs
                .marketingFcmToken ? (
                <span>
                  현재{" "}
                  <b>
                    {notificationPrefs
                      .marketingFcmBrowser ||
                      "선택한 기기"}
                  </b>
                  로 알림을 받고 있습니다.
                </span>
              ) : (
                <span>
                  아직 알림을 받을 기기가
                  지정되지 않았습니다.
                </span>
              )}

              {isCurrentMarketingDevice ? (
                <span>
                  지금 사용 중인{" "}
                  {currentDeviceName}에서
                  알림을 받습니다.
                </span>
              ) : (
                <Actions>
                  <Button
                    type="button"
                    disabled={
                      notificationPrefsSaving
                    }
                    onClick={
                      handleUseThisDeviceForMarketing
                    }
                  >
                    이 기기에서 알림 받기
                  </Button>
                </Actions>
              )}
            </Notice>
          )}

        {notificationPermission ===
          "default" && (
          <Notice aria-live="polite">
            <strong>
              휴대폰 알림 허용이 필요합니다.
            </strong>

            <span>
              알림을 허용하면 예약·교환
              진행 안내를 휴대폰 상단에서
              확인할 수 있습니다.
            </span>

            <Actions>
              <Button
                type="button"
                disabled={
                  notificationPrefsSaving
                }
                onClick={
                  requestNotificationPermission
                }
              >
                알림 허용하기
              </Button>
            </Actions>
          </Notice>
        )}

        {notificationPermission ===
          "denied" && (
          <Notice aria-live="polite">
            <strong>
              {isAndroid
                ? "한국골드마켓 앱 알림이 차단되어 있습니다."
                : "현재 브라우저에서 알림이 차단되어 있습니다."}
            </strong>

            <span>
              {isAndroid
                ? "휴대폰 설정에서 한국골드마켓 앱의 알림을 허용해 주세요."
                : "브라우저 설정에서 한국골드마켓 알림을 허용해 주세요."}
            </span>

            <Actions>
              <OutlineButton
                type="button"
                onClick={() =>
                  setNotificationHelpOpen(
                    (open) => !open
                  )
                }
                aria-expanded={
                  notificationHelpOpen
                }
              >
                {notificationHelpOpen
                  ? "허용 방법 닫기"
                  : "알림 허용 방법 보기"}
              </OutlineButton>
            </Actions>

            {notificationHelpOpen && (
              <Help>
                <strong>
                  {currentDeviceName}에서
                  알림 허용하기
                </strong>

                <ol>
                  {(isAndroid
                    ? [
                        "휴대폰 설정을 엽니다.",
                        "앱 또는 애플리케이션에서 한국골드마켓을 선택합니다.",
                        "알림을 선택한 뒤 알림 허용을 켭니다.",
                      ]
                    : getNotificationPermissionHelp(
                        currentBrowserName
                      )
                  ).map((step) => (
                    <li key={step}>
                      {step}
                    </li>
                  ))}
                </ol>
              </Help>
            )}
          </Notice>
        )}

        {notificationPermission ===
          "unsupported" && (
          <Notice aria-live="polite">
            <strong>
              이 브라우저에서는 휴대폰
              알림을 사용할 수 없습니다.
            </strong>

            <span>
              웹 알림을 지원하는
              브라우저에서 다시 열어 주세요.
            </span>
          </Notice>
        )}

        <NotificationSummary aria-live="polite">
          <div>
            <strong>
              현재 알림 상태
            </strong>

            <p>
              {pushDiagnosticsLoading
                ? "현재 기기의 알림 상태를 확인하고 있습니다."
                : pushReady
                  ? `${currentDeviceName}에서 알림을 받을 준비가 되어 있습니다.`
                  : notificationPermission ===
                      "denied"
                    ? isAndroid
                      ? "한국골드마켓 앱 알림이 차단되어 있습니다."
                      : "브라우저에서 알림이 차단되어 있습니다."
                    : notificationPermission ===
                        "default"
                      ? "알림 허용이 필요합니다."
                      : "알림 연결 상태를 한 번 확인해 주세요."}
            </p>
          </div>

          <Status
            $tone={
              pushReady
                ? "ok"
                : "warning"
            }
          >
            {pushReady
              ? "정상"
              : "확인 필요"}
          </Status>
        </NotificationSummary>

        <Actions
          style={{
            marginTop: 12,
          }}
        >
          <OutlineButton
            type="button"
            disabled={
              pushTestSending ||
              pushDiagnosticsLoading ||
              !pushDiagnostics
            }
            onClick={
              handleSendPushTest
            }
          >
            <BellRing
              aria-hidden="true"
            />

            {pushTestSending
              ? "시험 알림 보내는 중…"
              : "시험 알림 보내기"}
          </OutlineButton>
        </Actions>

        <TroubleshootDetails>
          <summary>
            알림이 오지 않나요? 문제 해결
          </summary>

          <StatusGrid aria-label="현재 기기 알림 상태">
            <StatusItem>
              <dt>알림 권한</dt>

              <dd>
                <Status
                  $tone={
                    pushDiagnostics
                      ?.notificationPermission ===
                    "granted"
                      ? "ok"
                      : pushDiagnostics
                            ?.notificationPermission ===
                          "denied" ||
                          pushDiagnostics
                            ?.notificationPermission ===
                            "unsupported"
                        ? "error"
                        : "warning"
                  }
                >
                  {notificationPermissionLabel(
                    pushDiagnostics
                      ?.notificationPermission ||
                      notificationPermission
                  )}
                </Status>
              </dd>
            </StatusItem>

            <StatusItem>
              <dt>기기 연결</dt>

              <dd>
                <Status
                  $tone={
                    pushDiagnostics
                      ?.tokenRegistrationHealthy
                      ? "ok"
                      : pushDiagnostics
                            ?.firestoreRegistrationChecked &&
                          pushDiagnostics
                            ?.tokenMatchesUser &&
                          !pushDiagnostics
                            ?.firestoreTokenRegistered
                        ? "error"
                        : "warning"
                  }
                >
                  {pushDiagnostics
                    ?.tokenRegistrationHealthy
                    ? "정상"
                    : pushDiagnostics
                          ?.firestoreRegistrationChecked &&
                        pushDiagnostics
                          ?.tokenMatchesUser &&
                        !pushDiagnostics
                          ?.firestoreTokenRegistered
                      ? "복구 필요"
                      : "확인 필요"}
                </Status>
              </dd>
            </StatusItem>

            <StatusItem>
              <dt>알림 수신</dt>

              <dd>
                <Status
                  $tone={
                    pushReady
                      ? "ok"
                      : "warning"
                  }
                >
                  {pushReady
                    ? "준비 완료"
                    : "확인 필요"}
                </Status>
              </dd>
            </StatusItem>
          </StatusGrid>

          <Actions
            style={{
              marginTop: 12,
              marginBottom: 14,
            }}
          >
            <OutlineButton
              type="button"
              disabled={
                pushTestSending ||
                pushDiagnosticsLoading
              }
              onClick={() =>
                refreshPushDiagnostics({
                  announce: true,
                })
              }
            >
              <RefreshCw
                aria-hidden="true"
              />

              상태 다시 확인
            </OutlineButton>
          </Actions>

          <AdvancedDetails>
            <summary>
              기술 정보 보기
            </summary>

            <AdvancedGrid>
              <AdvancedItem>
                <dt>기기 환경</dt>

                <dd>
                  {isAndroid
                    ? "Android · Native 앱"
                    : pushDiagnostics
                      ? `${
                          pushDiagnostics.platform
                        } · ${
                          pushDiagnostics
                            .standalone
                            ? "설치 앱"
                            : currentBrowserName
                        }`
                      : "확인 중"}
                </dd>
              </AdvancedItem>

              {isAndroid ? (
                <>
                  <AdvancedItem>
                    <dt>
                      푸시 방식
                    </dt>

                    <dd>
                      Android Native FCM
                    </dd>
                  </AdvancedItem>

                  <AdvancedItem>
                    <dt>
                      FCM 로컬 토큰
                    </dt>

                    <dd>
                      {pushDiagnostics
                        ?.tokenPresent
                        ? "등록됨"
                        : "등록 필요"}
                    </dd>
                  </AdvancedItem>

                  <AdvancedItem>
                    <dt>
                      회원 연결
                    </dt>

                    <dd>
                      {pushDiagnostics
                        ?.tokenMatchesUser
                        ? "현재 계정 연결됨"
                        : pushDiagnostics
                              ?.tokenPresent
                          ? "연결 확인 필요"
                          : "등록 필요"}
                    </dd>
                  </AdvancedItem>

                  <AdvancedItem>
                    <dt>
                      FCM 서버 등록
                    </dt>

                    <dd>
                      {pushDiagnostics
                        ?.tokenRegistrationHealthy
                        ? "정상 등록됨"
                        : "확인 필요"}
                    </dd>
                  </AdvancedItem>

                  <AdvancedItem>
                    <dt>
                      앱 실행 상태
                    </dt>

                    <dd>
                      Native 앱
                    </dd>
                  </AdvancedItem>
                </>
              ) : (
                <>
                  <AdvancedItem>
                    <dt>
                      서비스워커
                    </dt>

                    <dd>
                      {serviceWorkerStateLabel(
                        pushDiagnostics
                          ?.serviceWorkerState ||
                          "missing"
                      )}
                    </dd>
                  </AdvancedItem>

                  <AdvancedItem>
                    <dt>
                      웹 푸시
                    </dt>

                    <dd>
                      {pushDiagnostics
                          ?.secureContext &&
                      pushDiagnostics
                        ?.pushManagerSupported &&
                      pushDiagnostics
                        ?.messagingSupported
                        ? "지원됨"
                        : "확인 필요"}
                    </dd>
                  </AdvancedItem>

                  <AdvancedItem>
                    <dt>
                      FCM 로컬 토큰
                    </dt>

                    <dd>
                      {pushDiagnostics
                        ?.tokenMatchesUser
                        ? "현재 계정 토큰"
                        : pushDiagnostics
                              ?.tokenPresent
                          ? "다른 계정 토큰"
                          : "등록 필요"}
                    </dd>
                  </AdvancedItem>

                  <AdvancedItem>
                    <dt>
                      FCM 서버 등록
                    </dt>

                    <dd>
                      {pushDiagnostics
                        ?.tokenRegistrationHealthy
                        ? "정상 등록됨"
                        : pushDiagnostics
                              ?.firestoreRegistrationChecked &&
                            pushDiagnostics
                              ?.tokenMatchesUser &&
                            !pushDiagnostics
                              ?.firestoreTokenRegistered
                          ? "서버 등록 복구 필요"
                          : pushDiagnostics
                                ?.firestoreRegistrationError
                            ? "서버 확인 실패"
                            : "확인 필요"}
                    </dd>
                  </AdvancedItem>

                  <AdvancedItem>
                    <dt>
                      앱 실행 상태
                    </dt>

                    <dd>
                      {pushDiagnostics
                        ?.standalone
                        ? "설치 앱"
                        : "브라우저"}
                    </dd>
                  </AdvancedItem>
                </>
              )}
            </AdvancedGrid>
          </AdvancedDetails>
        </TroubleshootDetails>

        {notificationPrefsMessage && (
          <Message>
            {notificationPrefsMessage}
          </Message>
        )}

        {notificationPrefsError && (
          <Message $error>
            {notificationPrefsError}
          </Message>
        )}

        {pushDiagnosticsMessage && (
          <Message>
            {pushDiagnosticsMessage}
          </Message>
        )}

        {pushDiagnosticsError && (
          <Message $error>
            {pushDiagnosticsError}
          </Message>
        )}
      </Section>

      {/* ───────────── 보안 ───────────── */}
      <Section aria-labelledby="settings-security-title">
        <SectionTitle id="settings-security-title">
          보안
        </SectionTitle>

        <SectionDescription>
          비밀번호처럼 자주 바꾸지 않는
          항목은 필요할 때만 열어 사용할 수
          있습니다.
        </SectionDescription>

        <SettingDetails>
          <summary>
            <strong>
              비밀번호 변경
            </strong>

            <small>
              현재 비밀번호 확인 후 새
              비밀번호로 변경합니다.
            </small>
          </summary>

          <DetailsBody>
            <Form
              onSubmit={
                handlePasswordSubmit
              }
              autoComplete="on"
            >
              <FormGroup>
                <Label htmlFor="settingsCurrentPassword">
                  현재 비밀번호
                </Label>

                <Input
                  id="settingsCurrentPassword"
                  name="currentPassword"
                  type="password"
                  value={
                    currentPassword
                  }
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value
                    )
                  }
                  autoComplete="current-password"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="settingsNewPassword">
                  새 비밀번호
                </Label>

                <Input
                  id="settingsNewPassword"
                  name="newPassword"
                  type="password"
                  value={
                    newPassword
                  }
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </FormGroup>

              <Actions>
                <Button
                  type="submit"
                  disabled={
                    changingPwd
                  }
                >
                  <ShieldCheck
                    aria-hidden="true"
                  />

                  {changingPwd
                    ? "변경 중…"
                    : "비밀번호 변경"}
                </Button>
              </Actions>
            </Form>

            {pwdMessage && (
              <Message>
                {pwdMessage}
              </Message>
            )}

            {pwdError && (
              <Message $error>
                {pwdError}
              </Message>
            )}
          </DetailsBody>
        </SettingDetails>
      </Section>

      {/* ───────────── 약관 ───────────── */}
      <Section aria-labelledby="settings-policy-title">
        <SectionTitle id="settings-policy-title">
          약관 및 개인정보
        </SectionTitle>

        <SectionDescription>
          서비스 이용에 적용되는 약관과
          개인정보 처리 내용을 확인합니다.
        </SectionDescription>

        <LinkList>
          <SettingLink to="/terms">
            <span>
              이용약관
            </span>

            <ChevronRight
              aria-hidden="true"
            />
          </SettingLink>

          <SettingLink to="/privacy">
            <span>
              개인정보처리방침
            </span>

            <ChevronRight
              aria-hidden="true"
            />
          </SettingLink>
        </LinkList>
      </Section>

      {/* ───────────── 계정 관리 ───────────── */}
      <Section aria-labelledby="settings-account-title">
        <SectionTitle id="settings-account-title">
          계정 관리
        </SectionTitle>

        <SectionDescription>
          계정과 관련된 중요한 작업을
          관리합니다.
        </SectionDescription>

        <DangerDetails>
          <summary>
            <strong>
              계정 탈퇴
            </strong>

            <small>
              계정을 영구 삭제합니다.
              이 작업은 되돌릴 수 없습니다.
            </small>
          </summary>

          <DetailsBody>
            <DangerNote>
              탈퇴 시 Firebase 인증 계정,
              알림, 프로필 사진은 삭제되고
              진행 중인 방문예약은 취소됩니다.
              완료된 교환 및 고객문의 기록은
              관련 법령과 분쟁 대응을 위해
              필요한 기간 동안 식별정보를
              제거한 상태로 보존될 수 있습니다.
            </DangerNote>

            <Form
              onSubmit={
                handleDeleteAccount
              }
              autoComplete="on"
            >
              <FormGroup>
                <Label htmlFor="settingsDeletePassword">
                  현재 비밀번호
                </Label>

                <Input
                  id="settingsDeletePassword"
                  name="deletePassword"
                  type="password"
                  value={deletePwd}
                  onChange={(event) =>
                    setDeletePwd(
                      event.target.value
                    )
                  }
                  autoComplete="current-password"
                  required
                />
              </FormGroup>

              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems:
                    "flex-start",
                  lineHeight: 1.55,
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    deleteAgree
                  }
                  onChange={(event) =>
                    setDeleteAgree(
                      event.target
                        .checked
                    )
                  }
                  style={{
                    marginTop: 4,
                  }}
                />

                <span>
                  안내 사항을 모두
                  확인했으며 계정을 영구
                  삭제합니다.
                </span>
              </label>

              <Actions>
                <DangerButton
                  type="submit"
                  disabled={deleting}
                >
                  {deleting
                    ? "탈퇴 처리 중…"
                    : "계정 탈퇴"}
                </DangerButton>
              </Actions>
            </Form>

            {deleteMsg && (
              <Message>
                {deleteMsg}
              </Message>
            )}

            {deleteErr && (
              <Message $error>
                {deleteErr}
              </Message>
            )}
          </DetailsBody>
        </DangerDetails>
      </Section>
    </Container>
  );
}
