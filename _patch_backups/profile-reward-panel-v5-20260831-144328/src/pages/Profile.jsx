// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ChevronRight } from "lucide-react";
import { getAuth, updateProfile as updateAuthProfile } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import { useAuthContext } from "../context/AuthContext";
import { fetchMyProfile, updateUserProfile } from "../services/userService";
import { requestEmailChange } from "../services/authService";
import { storage } from "../firebase/firebase";
import Loader from "../components/common/Loader";
import { compressImage } from "../utils/imageCompression";
import {
  cancelBonusGoldUsage,
  claimWelcomeGoldBonus,
  getBonusGoldUsageState,
  getGoldQuizBonusStatus,
  getMemberBonusStatus,
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

const EmailChangePanel = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 18px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
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

function emailChangeErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "현재 비밀번호가 올바르지 않습니다.";
    case "auth/email-already-in-use":
      return "이미 다른 계정에서 사용 중인 이메일입니다.";
    case "auth/invalid-email":
      return "새 이메일 주소 형식을 확인해 주세요.";
    case "auth/too-many-requests":
      return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/requires-recent-login":
      return "보안을 위해 다시 로그인한 뒤 이메일 변경을 시도해 주세요.";
    default:
      return error?.message || "이메일 변경 요청 중 오류가 발생했습니다.";
  }
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
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [initialNickname, setInitialNickname] = useState("");
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const [goldBonus, setGoldBonus] = useState({
    loading: true,
    welcomeClaimed: false,
    welcomeG: 0,
    marketingClaimed: false,
    marketingG: 0,
    marketingUnavailable: false,
    quizClaimed: false,
    quizG: 0,
    earnedG: 0,
    maxG: 0.03,
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
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

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
          email: user.email || data?.email || "",
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
        marketingClaimed: false,
        marketingG: 0,
        marketingUnavailable: false,
        quizClaimed: false,
        quizG: 0,
        earnedG: 0,
        maxG: 0.03,
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

      let memberBonus = null;
      let memberBonusUnavailable = false;

      try {
        memberBonus = await getMemberBonusStatus();
      } catch {
        memberBonusUnavailable = true;
      }

      let quiz = null;
      let quizUnavailable = false;

      // 새 통합 혜택 조회가 일시적으로 실패하더라도
      // 기존 퀵퀴즈 상태는 계속 보여줄 수 있게 폴백합니다.
      if (!memberBonus) {
        try {
          quiz = await getGoldQuizBonusStatus(user.uid);
        } catch {
          quizUnavailable = true;
        }
      }

      if (!cancelled) {
        const rewards = memberBonus?.rewards || {};
        const welcomeReward = rewards.welcome || {};
        const marketingReward = rewards.marketingPush || {};
        const quizReward = rewards.quiz || {};

        const welcomeClaimed =
          memberBonus
            ? !!welcomeReward.claimed
            : !!welcome?.claimed;
        const welcomeG = Number(
          memberBonus
            ? welcomeReward.creditedG || 0
            : welcome?.creditedG || 0
        );

        const marketingClaimed =
          !!marketingReward.claimed;
        const marketingG = Number(
          marketingReward.creditedG || 0
        );

        const quizClaimed =
          memberBonus
            ? !!quizReward.claimed
            : !!quiz?.claimed;
        const quizG = Number(
          memberBonus
            ? quizReward.creditedG || 0
            : quiz?.creditedG || 0
        );

        const earnedG = Number(
          memberBonus?.earnedG ??
            welcomeG + marketingG + quizG
        );
        const maxG = Number(
          memberBonus?.maxG ?? 0.03
        );

        const fallbackBalance = Math.max(
          Number(memberBonus?.balanceG || 0),
          Number(welcome?.balanceG || 0),
          Number(quiz?.balanceG || 0)
        );

        setGoldBonus({
          loading: false,
          welcomeClaimed,
          welcomeG,
          welcomeUnavailable:
            welcomeUnavailable && !memberBonus,
          marketingClaimed,
          marketingG,
          marketingUnavailable:
            memberBonusUnavailable,
          quizClaimed,
          quizG,
          quizUnavailable:
            quizUnavailable && !memberBonus,
          earnedG,
          maxG,
          balanceG: Number(
            usage?.balanceG ?? fallbackBalance
          ),
          spendableG: Number(
            usage?.spendableG ??
              usage?.balanceG ??
              fallbackBalance
          ),
          usage: usage?.request || null,
          eligibleGroups: Array.isArray(
            usage?.eligibleGroups
          )
            ? usage.eligibleGroups
            : [],
          usageUnavailable,
        });
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
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !user?.uid || photoBusy) return;

    if (!String(file.type || "").startsWith("image/")) {
      setError("이미지 파일을 선택해 주세요.");
      setMessage("");
      input.value = "";
      return;
    }

    const MAX_PROFILE_FILE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_PROFILE_FILE_BYTES) {
      setError("프로필 사진은 10MB 이하의 이미지를 선택해 주세요.");
      setMessage("");
      input.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(previewUrl);
    setPhotoBusy(true);
    setUploadPct(0);
    setPhotoStatus("선택한 사진을 준비하고 있습니다.");
    setMessage("");
    setError("");

    try {
      let uploadFile = file;

      // 작은 이미지는 압축 시간을 쓰지 않고 바로 업로드합니다.
      // 큰 이미지만 프로필 용도에 맞게 가볍게 최적화합니다.
      const DIRECT_UPLOAD_MAX_BYTES = 2_500_000;
      if (file.size > DIRECT_UPLOAD_MAX_BYTES) {
        setPhotoStatus("프로필 사진에 맞게 이미지를 최적화하고 있습니다.");
        try {
          uploadFile = await compressImage(file, {
            maxW: 1024,
            maxH: 1024,
            targetMaxBytes: 700_000,
            quality: 0.86,
            preferMime: "image/webp",
          });
        } catch (compressError) {
          console.warn(
            "[profile] 이미지 최적화 실패, 원본 업로드로 폴백:",
            compressError
          );
          uploadFile = file;
        }
      }

      setPhotoStatus("프로필 사진을 업로드하고 있습니다.");

      const extFromName = (uploadFile.name.split(".").pop() || "").toLowerCase();
      const safeExt = extFromName || mimeToExt(uploadFile.type);
      const path = `profilePhotos/${user.uid}/${Date.now()}.${safeExt}`;

      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, uploadFile, {
        contentType: uploadFile.type,
        cacheControl: "private,max-age=31536000,immutable",
      });

      task.on("state_changed", (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const pct = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploadPct(pct);
          setPhotoStatus(`프로필 사진 업로드 중 · ${pct}%`);
        }
      });

      await task;
      const url = await getDownloadURL(task.snapshot.ref);
      setProfile((current) => ({ ...current, profileImage: url }));
      setPhotoPreviewUrl("");
      setPhotoStatus("새 프로필 사진이 준비되었습니다. 저장을 눌러 적용해 주세요.");
      setMessage("");
      setError("");
    } catch (uploadError) {
      console.error(uploadError);
      setPhotoPreviewUrl("");
      setPhotoStatus("");
      setError(
        uploadError?.code
          ? `프로필 사진 업로드에 실패했습니다. (${uploadError.code})`
          : "프로필 사진 업로드에 실패했습니다."
      );
      setMessage("");
    } finally {
      setUploadPct(0);
      setPhotoBusy(false);
      input.value = "";
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

  const handleEmailChangeRequest = async (event) => {
    event.preventDefault();
    if (!user?.uid || changingEmail) return;

    setError("");
    setMessage("");
    setChangingEmail(true);

    try {
      const result = await requestEmailChange(
        newEmail,
        emailPassword,
        "/profile"
      );

      setMessage(
        `${result.pendingEmail}로 이메일 변경 확인 메일을 보냈습니다. ` +
          "메일의 확인 링크를 눌러야 로그인 이메일이 실제로 변경됩니다."
      );
      setNewEmail("");
      setEmailPassword("");
      setEmailChangeOpen(false);
    } catch (changeError) {
      setError(emailChangeErrorMessage(changeError));
    } finally {
      setChangingEmail(false);
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

        <RewardPanel aria-label="신규회원 순금 혜택 적립 내역">
          <RewardTitle>
            <span aria-hidden="true">✨</span>
            신규회원 순금 혜택
          </RewardTitle>

          {goldBonus.loading ? (
            <span>적립 내역을 확인하고 있습니다.</span>
          ) : (
            <>
              <RewardRow>
                <span>회원가입 혜택</span>
                <b>
                  {goldBonus.welcomeClaimed
                    ? `${goldBonus.welcomeG.toFixed(2)}g 적립`
                    : goldBonus.welcomeUnavailable
                      ? "조회 필요"
                      : "적립 확인 중"}
                </b>
              </RewardRow>

              <RewardRow>
                <span>금시세 알림</span>
                {goldBonus.marketingClaimed ? (
                  <b>{goldBonus.marketingG.toFixed(2)}g 적립</b>
                ) : goldBonus.marketingUnavailable ? (
                  <b>조회 필요</b>
                ) : (
                  <Link to="/settings">순금 0.01g 더 받기</Link>
                )}
              </RewardRow>

              <RewardRow>
                <span>금 상식 퀵퀴즈</span>
                {goldBonus.quizClaimed ? (
                  <b>{goldBonus.quizG.toFixed(2)}g 적립</b>
                ) : goldBonus.quizUnavailable ? (
                  <b>조회 필요</b>
                ) : (
                  <Link to="/quiz/gold-bonus">순금 0.01g 더 받기</Link>
                )}
              </RewardRow>

              <RewardTotal>
                <span>신규회원 혜택</span>
                <b>
                  {goldBonus.earnedG.toFixed(2)}g /{" "}
                  {goldBonus.maxG.toFixed(2)}g
                  {goldBonus.earnedG + 0.000001 >= goldBonus.maxG
                    ? " 달성 🎉"
                    : ""}
                </b>
              </RewardTotal>

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
                각 혜택은 계정당 1회 제공됩니다. 적립 순금은 골드바 교환 시
                사용할 수 있으며 현금 환급·양도는 불가합니다.
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
                disabled={photoBusy}
              />

              {photoStatus && (
                <MessageText aria-live="polite">{photoStatus}</MessageText>
              )}

              {(photoPreviewUrl || profile.profileImage) && (
                <ImgPreview
                  src={photoPreviewUrl || profile.profileImage}
                  alt="프로필"
                />
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
                value={user.email || profile.email || ""}
                type="email"
                autoComplete="email"
                disabled
                readOnly
              />
              <small style={{ marginTop: 6, color: "var(--gm-text-light)" }}>
                로그인 이메일은 아래 ‘이메일 변경’에서 본인 확인 후 변경할 수 있습니다.
              </small>
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
              <Button type="submit" disabled={submitting || photoBusy}>
                {photoBusy
                  ? "사진 처리 중..."
                  : submitting
                    ? "저장중..."
                    : "저장"}
              </Button>
              <SecondaryButton
                type="button"
                disabled={photoBusy}
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
              <strong>이메일:</strong> {user.email || profile.email || "미등록"}
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

        <EmailChangePanel aria-label="로그인 이메일 변경">
          <div>
            <strong>로그인 이메일</strong>
            <p>
              현재 비밀번호로 본인 확인 후 새 이메일로 확인 메일을 보냅니다.
              확인 링크를 누르기 전까지는 기존 이메일이 유지됩니다.
            </p>
          </div>

          {!emailChangeOpen ? (
            <ButtonRow>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setEmailChangeOpen(true);
                  setNewEmail("");
                  setEmailPassword("");
                  setError("");
                  setMessage("");
                }}
              >
                이메일 변경
              </SecondaryButton>
            </ButtonRow>
          ) : (
            <Form onSubmit={handleEmailChangeRequest} autoComplete="on">
              <FormGroup>
                <Label htmlFor="newProfileEmail">새 이메일</Label>
                <Input
                  id="newProfileEmail"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="emailChangePassword">현재 비밀번호</Label>
                <Input
                  id="emailChangePassword"
                  type="password"
                  value={emailPassword}
                  onChange={(event) => setEmailPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </FormGroup>
              <ButtonRow>
                <Button type="submit" disabled={changingEmail}>
                  {changingEmail ? "확인 메일 발송 중…" : "새 이메일로 확인 메일 보내기"}
                </Button>
                <SecondaryButton
                  type="button"
                  disabled={changingEmail}
                  onClick={() => {
                    setEmailChangeOpen(false);
                    setNewEmail("");
                    setEmailPassword("");
                  }}
                >
                  취소
                </SecondaryButton>
              </ButtonRow>
            </Form>
          )}
        </EmailChangePanel>

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
