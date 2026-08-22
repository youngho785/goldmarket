// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ChevronRight } from "lucide-react";
import { getAuth, updateProfile as updateAuthProfile } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import { useAuthContext } from "../context/AuthContext";
import { fetchMyProfile, updateUserProfile } from "../services/userService";
import { storage } from "../firebase/firebase";
import Loader from "../components/common/Loader";
import { compressImage } from "../utils/imageCompression";
import {
  cancelBonusGoldUsage,
  claimWelcomeGoldBonus,
  getBonusGoldUsageState,
  getGoldQuizBonusStatus,
  requestBonusGoldUsage,
} from "../services/quizClient";

/* ───────────── Styled ───────────── */
const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 0 32px;
  color: ${({ theme }) => theme.colors.text};
`;

const Section = styled.section`
  margin-bottom: 18px;
  padding: clamp(20px, 4vw, 28px);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const Title = styled.h1`
  position: relative;
  margin: 0 0 26px;
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 7px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 750;
`;

const Input = styled.input`
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;

  &[disabled] {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const ImgPreview = styled.img`
  width: 108px;
  height: 108px;
  margin-top: 10px;
  object-fit: cover;
  border: 3px solid ${({ theme }) => theme.colors.surface};
  border-radius: 50%;
  outline: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const Button = styled.button`
  min-height: 46px;
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: 1rem;
  font-weight: 750;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:hover:enabled {
    filter: brightness(0.96);
  }
`;

const SecondaryButton = styled(Button)`
  border-color: ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
`;

const MessageText = styled.p`
  margin: 16px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  color: ${({ $error, theme }) =>
    $error ? theme.semantic.alertErrorText : theme.semantic.alertSuccessText};
  background: ${({ $error, theme }) =>
    $error ? theme.semantic.alertErrorBg : theme.semantic.alertSuccessBg};
`;

const ProfileDetails = styled.div`
  display: grid;
  gap: 2px;

  p {
    margin: 8px 0;
    line-height: 1.55;
  }
`;

const RewardPanel = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.semantic.alertSuccessBg};
  color: ${({ theme }) => theme.semantic.alertSuccessText};
`;

const RewardTitle = styled.strong`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.02rem;
`;

const RewardRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 9px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  b {
    white-space: nowrap;
  }
`;

const RewardTotal = styled(RewardRow)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 800;
`;

const RewardNote = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.86rem;
  line-height: 1.6;
`;

const RewardAction = styled.button`
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const RewardLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 800;
`;

const RewardUsagePanel = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

const RewardSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 9px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

const RewardCode = styled.strong`
  display: block;
  padding: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.secondary};
  border-radius: 10px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 1.55rem;
  letter-spacing: 0.16em;
  text-align: center;
`;

const RewardError = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.semantic.alertErrorText};
  font-size: 0.9rem;
`;

const SettingsShortcut = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 24px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => theme.colors.secondary};
  }

  > span {
    display: grid;
    gap: 4px;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.98rem;
  }

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.82rem;
    line-height: 1.5;
  }

  svg {
    width: 19px;
    height: 19px;
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

/* ───────────── Utils ───────────── */
function formatPhone(input) {
  const digits = (input || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function validatePhone(phone) {
  if (!phone) return true;
  return /^01[016789]-\d{3,4}-\d{4}$/.test(phone);
}

function mimeToExt(type) {
  if (!type) return "bin";
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  return "bin";
}

/* ───────────── Page ───────────── */
export default function Profile() {
  const { user } = useAuthContext();
  const auth = getAuth();

  const [profile, setProfile] = useState({
    displayName: "",
    nickname: "",
    email: "",
    phone: "",
    profileImage: "",
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadPct, setUploadPct] = useState(0);
  const [initialNickname, setInitialNickname] = useState("");

  const [goldBonus, setGoldBonus] = useState({
    loading: true,
    welcomeClaimed: false,
    welcomeG: 0,
    quizClaimed: false,
    quizG: 0,
    balanceG: 0,
    spendableG: 0,
    usage: null,
    eligibleGroups: [],
    usageUnavailable: false,
  });
  const [bonusUsageOpen, setBonusUsageOpen] = useState(false);
  const [selectedBonusGroupId, setSelectedBonusGroupId] = useState("");
  const [bonusActionBusy, setBonusActionBusy] = useState(false);
  const [bonusActionError, setBonusActionError] = useState("");

  useEffect(() => {
    if (!user?.uid) return undefined;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await fetchMyProfile(user.uid);
        if (cancelled) return;

        const mergedDisplayName = data?.displayName || user.displayName || "";
        const next = {
          displayName: mergedDisplayName,
          nickname: data?.nickname || "",
          email: data?.email || user.email || "",
          phone: data?.phone || "",
          profileImage: data?.photoURL || data?.profileImage || "",
        };

        setProfile(next);
        setInitialNickname(next.nickname || "");

        if (
          auth.currentUser &&
          mergedDisplayName &&
          auth.currentUser.displayName !== mergedDisplayName
        ) {
          try {
            await updateAuthProfile(auth.currentUser, {
              displayName: mergedDisplayName,
            });
          } catch (syncError) {
            console.warn("Auth 프로필 동기화 실패:", syncError?.message || syncError);
          }
        }
      } catch {
        if (!cancelled) setError("프로필을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.displayName, user?.email, auth]);

  useEffect(() => {
    let cancelled = false;

    if (!user?.uid) {
      setGoldBonus({
        loading: false,
        welcomeClaimed: false,
        welcomeG: 0,
        quizClaimed: false,
        quizG: 0,
        balanceG: 0,
        spendableG: 0,
        usage: null,
        eligibleGroups: [],
        usageUnavailable: false,
      });
      return () => {
        cancelled = true;
      };
    }

    setGoldBonus((current) => ({ ...current, loading: true }));

    (async () => {
      let welcome = null;
      let welcomeUnavailable = false;
      try {
        welcome = await claimWelcomeGoldBonus();
      } catch {
        welcomeUnavailable = true;
      }

      let usage = null;
      let usageUnavailable = false;
      try {
        usage = await getBonusGoldUsageState();
      } catch {
        usageUnavailable = true;
      }

      try {
        const quiz = await getGoldQuizBonusStatus(user.uid);
        if (!cancelled) {
          setGoldBonus({
            loading: false,
            welcomeClaimed: !!welcome?.claimed,
            welcomeG: Number(welcome?.creditedG || 0),
            welcomeUnavailable,
            quizClaimed: !!quiz?.claimed,
            quizG: Number(quiz?.creditedG || 0),
            balanceG: Number(
              usage?.balanceG ??
                Math.max(
                  Number(welcome?.balanceG || 0),
                  Number(quiz?.balanceG || 0)
                )
            ),
            spendableG: Number(
              usage?.spendableG ??
                usage?.balanceG ??
                Math.max(
                  Number(welcome?.balanceG || 0),
                  Number(quiz?.balanceG || 0)
                )
            ),
            usage: usage?.request || null,
            eligibleGroups: Array.isArray(usage?.eligibleGroups)
              ? usage.eligibleGroups
              : [],
            usageUnavailable,
          });
        }
      } catch {
        if (!cancelled) {
          setGoldBonus((current) => ({
            ...current,
            loading: false,
            welcomeClaimed: !!welcome?.claimed,
            welcomeG: Number(welcome?.creditedG || 0),
            welcomeUnavailable,
            quizUnavailable: true,
            balanceG: Number(usage?.balanceG ?? welcome?.balanceG ?? 0),
            spendableG: Number(
              usage?.spendableG ?? usage?.balanceG ?? welcome?.balanceG ?? 0
            ),
            usage: usage?.request || null,
            eligibleGroups: Array.isArray(usage?.eligibleGroups)
              ? usage.eligibleGroups
              : [],
            usageUnavailable,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedBonusGroupId && goldBonus.eligibleGroups.length > 0) {
      setSelectedBonusGroupId(goldBonus.eligibleGroups[0].groupId);
    }
    if (goldBonus.usage?.status === "requested") {
      setBonusUsageOpen(true);
    }
  }, [goldBonus.eligibleGroups, goldBonus.usage?.status, selectedBonusGroupId]);

  const handleBonusUsageRequest = async () => {
    if (!selectedBonusGroupId) {
      setBonusActionError("적립 순금을 사용할 금교환 예약을 선택해 주세요.");
      return;
    }

    setBonusActionBusy(true);
    setBonusActionError("");

    try {
      const result = await requestBonusGoldUsage(selectedBonusGroupId);
      setGoldBonus((current) => ({
        ...current,
        balanceG: Number(result?.balanceG ?? current.balanceG),
        spendableG: Number(result?.spendableG ?? 0),
        usage: result?.request || current.usage,
      }));
      setBonusUsageOpen(true);
    } catch (requestError) {
      setBonusActionError(
        requestError?.message || "사용 신청을 처리하지 못했습니다."
      );
    } finally {
      setBonusActionBusy(false);
    }
  };

  const handleBonusUsageCancel = async () => {
    if (!window.confirm("적립 순금 사용 신청을 취소할까요?")) return;

    setBonusActionBusy(true);
    setBonusActionError("");

    try {
      await cancelBonusGoldUsage();
      const usage = await getBonusGoldUsageState();
      setGoldBonus((current) => ({
        ...current,
        balanceG: Number(usage?.balanceG || 0),
        spendableG: Number(usage?.spendableG ?? usage?.balanceG ?? 0),
        usage: usage?.request || null,
        eligibleGroups: Array.isArray(usage?.eligibleGroups)
          ? usage.eligibleGroups
          : [],
      }));
      setBonusUsageOpen(false);
    } catch (cancelError) {
      setBonusActionError(
        cancelError?.message || "사용 신청을 취소하지 못했습니다."
      );
    } finally {
      setBonusActionBusy(false);
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    try {
      let uploadFile = file;
      try {
        uploadFile = await compressImage(file, {
          maxW: 1600,
          maxH: 1600,
          targetMaxBytes: 1_200_000,
          quality: 0.88,
          preferMime: "image/webp",
        });
      } catch (compressError) {
        console.warn(
          "[profile] 이미지 압축 실패, 원본 업로드로 폴백:",
          compressError
        );
      }

      const extFromName = (uploadFile.name.split(".").pop() || "").toLowerCase();
      const safeExt = extFromName || mimeToExt(uploadFile.type);
      const path = `profilePhotos/${user.uid}/${Date.now()}.${safeExt}`;

      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, uploadFile, {
        contentType: uploadFile.type,
        cacheControl: "public,max-age=31536000,immutable",
      });

      task.on("state_changed", (snapshot) => {
        if (snapshot.totalBytes > 0) {
          setUploadPct(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          );
        }
      });

      await task;
      const url = await getDownloadURL(task.snapshot.ref);
      setProfile((current) => ({ ...current, profileImage: url }));
      setMessage("프로필 사진이 업로드되었습니다.");
      setError("");
    } catch (uploadError) {
      console.error(uploadError);
      setError("프로필 사진 업로드에 실패했습니다.");
      setMessage("");
    } finally {
      setUploadPct(0);
    }
  };

  const canSetNicknameFirstTime = !initialNickname;

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    if (name === "phone") {
      setProfile((current) => ({
        ...current,
        phone: formatPhone(value),
      }));
    } else if (name === "nickname") {
      if (canSetNicknameFirstTime) {
        setProfile((current) => ({ ...current, nickname: value }));
      }
    } else {
      setProfile((current) => ({ ...current, [name]: value }));
    }

    setError("");
    setMessage("");
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!user?.uid) return;

    if (!validatePhone(profile.phone)) {
      setError("전화번호 형식을 확인해주세요.");
      return;
    }

    if (!canSetNicknameFirstTime && profile.nickname !== initialNickname) {
      setError("닉네임은 고유값이며 변경할 수 없습니다.");
      return;
    }

    setSubmitting(true);

    try {
      await updateUserProfile(user.uid, {
        displayName: profile.displayName || "",
        nickname: canSetNicknameFirstTime
          ? profile.nickname || ""
          : initialNickname,
        email: profile.email || user.email || "",
        phone: profile.phone || "",
        photoURL: profile.profileImage || "",
        profileImage: profile.profileImage || "",
      });

      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, {
          displayName: profile.displayName || "",
          photoURL: profile.profileImage || null,
        });
      }

      if (canSetNicknameFirstTime) {
        setInitialNickname(profile.nickname || "");
      }

      setMessage("프로필이 저장되었습니다.");
      setError("");
      setEditing(false);
    } catch (saveError) {
      console.error(saveError);
      setError("저장 중 오류가 발생했습니다.");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  const usageStatusLabel =
    {
      requested: "매장 확인 대기",
      used: "사용 완료",
      canceled: "신청 취소",
      restored: "잔액 복구 완료",
    }[goldBonus.usage?.status] || "";

  const canRequestBonus =
    goldBonus.balanceG > 0 && goldBonus.usage?.status !== "requested";

  if (!user) {
    return (
      <Container>
        <Section>
          <Title>로그인이 필요합니다</Title>
          <Link to="/login">로그인하러 가기</Link>
        </Section>
      </Container>
    );
  }

  if (loading) return <Loader />;

  return (
    <Container>
      <Section>
        <Title>내 프로필</Title>

        <RewardPanel aria-label="순금 보너스 적립 내역">
          <RewardTitle>
            <span aria-hidden="true">✨</span>
            순금 보너스
          </RewardTitle>

          {goldBonus.loading ? (
            <span>적립 내역을 확인하고 있습니다.</span>
          ) : (
            <>
              <RewardRow>
                <span>회원가입 웰컴 순금</span>
                <b>
                  {goldBonus.welcomeClaimed
                    ? `${goldBonus.welcomeG.toFixed(2)}g 적립`
                    : goldBonus.welcomeUnavailable
                      ? "조회 필요"
                      : "적립 확인 중"}
                </b>
              </RewardRow>

              <RewardRow>
                <span>퀵퀴즈 순금</span>
                {goldBonus.quizClaimed ? (
                  <b>{goldBonus.quizG.toFixed(2)}g 적립</b>
                ) : goldBonus.quizUnavailable ? (
                  <b>조회 필요</b>
                ) : (
                  <Link to="/quiz/gold-bonus">0.01g 받기</Link>
                )}
              </RewardRow>

              <RewardTotal>
                <span>지금 사용 가능한 적립 순금</span>
                <b>{goldBonus.spendableG.toFixed(2)}g</b>
              </RewardTotal>

              {goldBonus.usage && (
                <RewardUsagePanel aria-live="polite">
                  <b>적립 순금 사용 상태 · {usageStatusLabel}</b>
                  <span>
                    신청 중량 {Number(goldBonus.usage.amountG || 0).toFixed(2)}g
                    {goldBonus.usage.visitDate
                      ? ` · ${goldBonus.usage.visitDate} ${
                          goldBonus.usage.visitTime || ""
                        }`
                      : ""}
                  </span>

                  {goldBonus.usage.status === "requested" && (
                    <>
                      <span>
                        매장에서 아래 6자리 코드를 관리자에게 보여주세요.
                      </span>
                      <RewardCode
                        aria-label={`매장 확인 코드 ${goldBonus.usage.requestCode}`}
                      >
                        {goldBonus.usage.requestCode}
                      </RewardCode>
                      <RewardAction
                        type="button"
                        disabled={bonusActionBusy}
                        onClick={handleBonusUsageCancel}
                      >
                        {bonusActionBusy ? "처리 중…" : "사용 신청 취소"}
                      </RewardAction>
                    </>
                  )}

                  {goldBonus.usage.status === "used" && (
                    <span>
                      현장 인정{" "}
                      {Number(goldBonus.usage.finalRecognizedG || 0).toFixed(3)}g
                      {" + "}적립{" "}
                      {Number(goldBonus.usage.amountG || 0).toFixed(2)}g
                      {" = "}최종{" "}
                      {Number(goldBonus.usage.finalAppliedG || 0).toFixed(3)}g
                    </span>
                  )}
                </RewardUsagePanel>
              )}

              {canRequestBonus && goldBonus.eligibleGroups.length > 0 && (
                <>
                  <RewardAction
                    type="button"
                    onClick={() => setBonusUsageOpen((open) => !open)}
                    aria-expanded={bonusUsageOpen}
                  >
                    적립 순금 사용 신청
                  </RewardAction>

                  {bonusUsageOpen &&
                    goldBonus.usage?.status !== "requested" && (
                      <RewardUsagePanel>
                        <label htmlFor="bonus-exchange-group">
                          <b>사용할 금교환 예약</b>
                        </label>

                        <RewardSelect
                          id="bonus-exchange-group"
                          value={selectedBonusGroupId}
                          onChange={(event) =>
                            setSelectedBonusGroupId(event.target.value)
                          }
                        >
                          {goldBonus.eligibleGroups.map((group) => (
                            <option key={group.groupId} value={group.groupId}>
                              {group.visitDate || "방문일 미정"}{" "}
                              {group.visitTime || ""} ·{" "}
                              {group.status === "requested"
                                ? "접수"
                                : group.status === "scheduled"
                                  ? "예약 승인"
                                  : "진행 중"}
                            </option>
                          ))}
                        </RewardSelect>

                        <RewardNote>
                          현재 보유한 적립 순금 전액을 선택한 교환 건에
                          신청합니다.
                        </RewardNote>

                        <RewardAction
                          type="button"
                          disabled={bonusActionBusy || !selectedBonusGroupId}
                          onClick={handleBonusUsageRequest}
                        >
                          {bonusActionBusy
                            ? "신청 중…"
                            : `${goldBonus.balanceG.toFixed(2)}g 사용 신청`}
                        </RewardAction>
                      </RewardUsagePanel>
                    )}
                </>
              )}

              {canRequestBonus &&
                goldBonus.eligibleGroups.length === 0 &&
                !goldBonus.usageUnavailable && (
                  <RewardLink to="/gold-exchange">
                    금교환 예약 후 사용 신청
                  </RewardLink>
                )}

              {bonusActionError && (
                <RewardError role="alert">{bonusActionError}</RewardError>
              )}

              <RewardNote>
                웰컴 순금과 퀵퀴즈 적립 순금은 골드바 교환 시 중량으로
                더해집니다. 현금 환급·양도는 불가하며, 매장에서 본인과
                최종 인정 중량을 확인한 뒤 사용이 확정됩니다.
              </RewardNote>
            </>
          )}
        </RewardPanel>

        {error && <MessageText $error>{error}</MessageText>}
        {message && <MessageText>{message}</MessageText>}

        {editing ? (
          <Form onSubmit={handleProfileSubmit} autoComplete="on">
            <FormGroup>
              <Label htmlFor="profilePhoto">프로필 사진</Label>
              <Input
                id="profilePhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />

              {!!uploadPct && uploadPct > 0 && (
                <MessageText>{`업로드 ${uploadPct}%`}</MessageText>
              )}

              {profile.profileImage && (
                <ImgPreview src={profile.profileImage} alt="프로필" />
              )}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="profileDisplayName">이름</Label>
              <Input
                id="profileDisplayName"
                name="displayName"
                value={profile.displayName}
                onChange={handleInputChange}
                type="text"
                autoComplete="name"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="profileNickname">
                닉네임{" "}
                {!!initialNickname && (
                  <small
                    style={{
                      color: "var(--gm-text-light)",
                      fontWeight: 400,
                    }}
                  >
                    (고유값·변경 불가)
                  </small>
                )}
              </Label>
              <Input
                id="profileNickname"
                name="nickname"
                value={profile.nickname}
                onChange={handleInputChange}
                type="text"
                autoComplete="nickname"
                disabled={!!initialNickname}
                placeholder={
                  !initialNickname
                    ? "닉네임을 설정하세요 (설정 후 변경 불가)"
                    : "닉네임은 변경할 수 없습니다"
                }
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="profileEmail">이메일</Label>
              <Input
                id="profileEmail"
                name="email"
                value={profile.email}
                onChange={handleInputChange}
                type="email"
                autoComplete="email"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="profilePhone">전화번호</Label>
              <Input
                id="profilePhone"
                name="phone"
                value={profile.phone}
                onChange={handleInputChange}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="010-1234-5678"
              />
            </FormGroup>

            <ButtonRow>
              <Button type="submit" disabled={submitting}>
                {submitting ? "저장중..." : "저장"}
              </Button>
              <SecondaryButton
                type="button"
                onClick={() => setEditing(false)}
              >
                취소
              </SecondaryButton>
            </ButtonRow>
          </Form>
        ) : (
          <ProfileDetails>
            {profile.profileImage && (
              <ImgPreview src={profile.profileImage} alt="프로필" />
            )}

            <p>
              <strong>이름:</strong> {profile.displayName || "미등록"}
            </p>
            <p>
              <strong>닉네임:</strong> {profile.nickname || "미등록"}
            </p>
            <p>
              <strong>이메일:</strong> {profile.email}
            </p>
            <p>
              <strong>전화번호:</strong> {profile.phone || "미등록"}
            </p>

            <ButtonRow>
              <Button type="button" onClick={() => setEditing(true)}>
                프로필 수정
              </Button>
            </ButtonRow>
          </ProfileDetails>
        )}

        <SettingsShortcut to="/settings">
          <span>
            <strong>설정</strong>
            <small>
              알림, 보안, 약관 및 계정 관리를 변경합니다.
            </small>
          </span>
          <ChevronRight aria-hidden="true" />
        </SettingsShortcut>
      </Section>
    </Container>
  );
}