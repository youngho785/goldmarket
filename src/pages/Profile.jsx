// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuthContext } from "../context/AuthContext";
import { fetchMyProfile, updateUserProfile } from "../services/userService";
import { storage } from "../firebase/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Loader from "../components/common/Loader";
import TransactionReviewsSummary from "./TransactionReviewsSummary";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile as updateAuthProfile,
  deleteUser,
} from "firebase/auth";
import { compressImage } from "../utils/imageCompression";
import { callDeleteMyAccount, unregisterPush } from "../firebase/firebase";
import {
  cancelBonusGoldUsage,
  claimWelcomeGoldBonus,
  getBonusGoldUsageState,
  getGoldQuizBonusStatus,
  requestBonusGoldUsage,
} from "../services/quizClient";

/* ───────────── Styled ───────────── */
const Container = styled.div`
  padding: 8px 0 32px;
  max-width: 720px;
  margin: auto;
  color: ${({ theme }) => theme.colors.text};
`;
const Title = styled.h1`
  position: relative;
  margin-bottom: 26px;
  padding-bottom: 14px;
  color: ${({ theme }) => theme.colors.text};
  &::after { content: ""; position: absolute; left: 0; bottom: 0; width: 50px; height: 3px; border-radius: 999px; background: ${({ theme }) => theme.gradients.gold}; }
`;
const Section = styled.section`
  margin-bottom: 18px;
  padding: clamp(20px, 4vw, 28px);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
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
  font-weight: 750;
  margin-bottom: 7px;
  color: ${({ theme }) => theme.colors.text};
`;
const Input = styled.input`
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;

  &::-ms-reveal,
  &::-ms-clear {
    display: none;
  }

  &[disabled] {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;
const ImgPreview = styled.img`
  width: 108px;
  height: 108px;
  object-fit: cover;
  border-radius: 50%;
  margin-top: 10px;
  border: 3px solid ${({ theme }) => theme.colors.surface};
  outline: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;
const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
`;
const Button = styled.button`
  min-height: 46px;
  padding: 10px 16px;
  font-size: 1rem;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.small};
  font-weight: 750;
  cursor: pointer;
  transition: background 0.2s;
  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
  &:hover:enabled {
    filter: brightness(.96);
  }
`;
const DangerButton = styled(Button)`
  background: ${({ theme }) => theme.colors.error};
  &:hover:enabled {
    filter: brightness(.9);
  }
`;
const MessageText = styled.p`
  color: ${({ $error, theme }) => ($error ? theme.semantic.alertErrorText : theme.semantic.alertSuccessText)};
  background: ${({ $error, theme }) => ($error ? theme.semantic.alertErrorBg : theme.semantic.alertSuccessBg)};
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 16px;
`;
const Divider = styled.hr`
  margin: 32px 0;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;
const VisuallyHidden = styled.input`
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: -1px;
`;

const RewardPanel = styled.div`
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border || "#e5e7eb"};
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
  font-size: .86rem;
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
    opacity: .55;
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
  letter-spacing: .16em;
  text-align: center;
`;

const RewardError = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.semantic.alertErrorText};
  font-size: .9rem;
`;

/* ───────────── Utils ───────────── */
// 10자리(3-3-4), 11자리(3-4-4)로 포맷
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
function validateNewPassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) {
    return "비밀번호는 최소 8자 이상이어야 합니다.";
  }
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw) || !/[!@#$%^&*()_+{};':",.<>/?\\|`~-]/.test(pw)) {
    return "영문/숫자/특수문자를 모두 포함해야 합니다.";
  }
  return "";
}
function mimeToExt(t) {
  if (!t) return "bin";
  if (t === "image/webp") return "webp";
  if (t === "image/png") return "png";
  if (t === "image/jpeg" || t === "image/jpg") return "jpg";
  return "bin";
}
const FLASH_PW_OK = "flash_pw_changed_ok";
const APP_BUSY_KEY = "__app_busy__";

/* ───────────── Page ───────────── */
export default function Profile() {
  const { user, changePassword } = useAuthContext();
  const auth = getAuth();
  const navigate = useNavigate();

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

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdMessage, setPwdMessage] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  // 탈퇴
  const [deletePwd, setDeletePwd] = useState("");
  const [deleteAgree, setDeleteAgree] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleteErr, setDeleteErr] = useState("");

  // 업로드 진행률
  const [uploadPct, setUploadPct] = useState(0);

  // 최초 닉네임 보존
  const [initialNickname, setInitialNickname] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await fetchMyProfile(user.uid);
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

        // Firebase Auth 프로필 동기화
        if (auth.currentUser && mergedDisplayName && auth.currentUser.displayName !== mergedDisplayName) {
          try {
            await updateAuthProfile(auth.currentUser, { displayName: mergedDisplayName });
          } catch (e) {
            console.warn("Auth 프로필 동기화 실패:", e?.message || e);
          }
        }
      } catch {
        setError("프로필을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
        try {
          if (sessionStorage.getItem(FLASH_PW_OK) === "1") {
            setPwdMessage("비밀번호가 성공적으로 변경되었습니다.");
            sessionStorage.removeItem(FLASH_PW_OK);
          }
        } catch {}
      }
    })();
  }, [user, auth]);

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
      return () => { cancelled = true; };
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
            balanceG: Number(usage?.balanceG ?? Math.max(
              Number(welcome?.balanceG || 0),
              Number(quiz?.balanceG || 0)
            )),
            spendableG: Number(usage?.spendableG ?? usage?.balanceG ?? Math.max(
              Number(welcome?.balanceG || 0),
              Number(quiz?.balanceG || 0)
            )),
            usage: usage?.request || null,
            eligibleGroups: Array.isArray(usage?.eligibleGroups) ? usage.eligibleGroups : [],
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
            spendableG: Number(usage?.spendableG ?? usage?.balanceG ?? welcome?.balanceG ?? 0),
            usage: usage?.request || null,
            eligibleGroups: Array.isArray(usage?.eligibleGroups) ? usage.eligibleGroups : [],
            usageUnavailable,
          }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedBonusGroupId && goldBonus.eligibleGroups.length > 0) {
      setSelectedBonusGroupId(goldBonus.eligibleGroups[0].groupId);
    }
    if (goldBonus.usage?.status === "requested") setBonusUsageOpen(true);
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
      setBonusActionError(requestError?.message || "사용 신청을 처리하지 못했습니다.");
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
        eligibleGroups: Array.isArray(usage?.eligibleGroups) ? usage.eligibleGroups : [],
      }));
      setBonusUsageOpen(false);
    } catch (cancelError) {
      setBonusActionError(cancelError?.message || "사용 신청을 취소하지 못했습니다.");
    } finally {
      setBonusActionBusy(false);
    }
  };

  const usageStatusLabel = {
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
        <Title>로그인이 필요합니다</Title>
        <Link to="/login">로그인하러 가기</Link>
      </Container>
    );
  }
  if (loading) return <Loader />;

  const canSetNicknameFirstTime = !initialNickname;

  /* ───────── Profile Edit ───────── */
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      } catch (compressErr) {
        console.warn("[profile] 이미지 압축 실패, 원본 업로드로 폴백:", compressErr);
      }

      const extFromName = (uploadFile.name.split(".").pop() || "").toLowerCase();
      const safeExt = extFromName || mimeToExt(uploadFile.type);
      const path = `profilePhotos/${user.uid}/${Date.now()}.${safeExt}`;

      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, uploadFile, {
        contentType: uploadFile.type,
        cacheControl: "public,max-age=31536000,immutable",
      });

      task.on("state_changed", (s) => {
        if (s.totalBytes > 0) {
          setUploadPct(Math.round((s.bytesTransferred / s.totalBytes) * 100));
        }
      });

      await task;
      const url = await getDownloadURL(task.snapshot.ref);
      setProfile((p) => ({ ...p, profileImage: url }));
      setMessage("프로필 사진이 업로드되었습니다.");
      setError("");
    } catch (err) {
      console.error(err);
      setError("프로필 사진 업로드에 실패했습니다.");
      setMessage("");
    } finally {
      setUploadPct(0);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setProfile((p) => ({ ...p, phone: formatPhone(value) }));
    } else if (name === "nickname") {
      if (canSetNicknameFirstTime) {
        setProfile((p) => ({ ...p, nickname: value }));
      }
    } else {
      setProfile((p) => ({ ...p, [name]: value }));
    }
    setError("");
    setMessage("");
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
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
        nickname: canSetNicknameFirstTime ? (profile.nickname || "") : initialNickname,
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
    } catch (err) {
      console.error(err);
      setError("저장 중 오류가 발생했습니다.");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  /* ───────── Password Change ───────── */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdMessage("");

    if (!currentPassword || !newPassword) {
      setPwdError("현재 비밀번호와 새 비밀번호를 모두 입력해주세요.");
      return;
    }
    const validationMsg = validateNewPassword(newPassword);
    if (validationMsg) {
      setPwdError(validationMsg);
      return;
    }
    if (currentPassword === newPassword) {
      setPwdError("새 비밀번호가 현재 비밀번호와 동일합니다.");
      return;
    }

    setChangingPwd(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await changePassword(newPassword);

      try {
        sessionStorage.setItem(FLASH_PW_OK, "1");
      } catch {}

      setPwdMessage("비밀번호가 성공적으로 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      switch (err.code) {
        case "auth/wrong-password":
          setPwdError("현재 비밀번호가 올바르지 않습니다.");
          break;
        case "auth/weak-password":
          setPwdError("새 비밀번호가 너무 약합니다. 8자 이상이며, 영문/숫자/특수문자를 포함해야 합니다.");
          break;
        case "auth/too-many-requests":
          setPwdError("비밀번호 변경 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
          break;
        default:
          setPwdError(`오류가 발생했습니다: ${err.message}`);
      }
    } finally {
      setChangingPwd(false);
    }
  };

  /* ───────── Account Deletion ───────── */
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteErr("");
    setDeleteMsg("");

    if (!deleteAgree) {
      setDeleteErr("탈퇴 안내를 확인하고 동의해 주세요.");
      return;
    }
    if (!deletePwd) {
      setDeleteErr("보안을 위해 현재 비밀번호를 입력해 주세요.");
      return;
    }

    setDeleting(true);
    try {
      sessionStorage.setItem(APP_BUSY_KEY, "1");
    } catch {}

    try {
      const cred = EmailAuthProvider.credential(user.email, deletePwd);
      await reauthenticateWithCredential(auth.currentUser, cred);

      await callDeleteMyAccount();

      try {
        await unregisterPush(user.uid);
      } catch {}

      await deleteUser(auth.currentUser);

      setDeleteMsg("계정이 삭제되었습니다. 그동안 이용해 주셔서 감사합니다.");

      setTimeout(() => {
        try {
          sessionStorage.removeItem(APP_BUSY_KEY);
        } catch {}
        navigate("/", { replace: true });
      }, 1000);
    } catch (err) {
      if (err?.code === "auth/wrong-password") {
        setDeleteErr("현재 비밀번호가 올바르지 않습니다.");
      } else if (err?.code === "auth/too-many-requests") {
        setDeleteErr("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        setDeleteErr(`탈퇴 처리 중 오류: ${err?.message || err}`);
      }
      try {
        sessionStorage.removeItem(APP_BUSY_KEY);
      } catch {}
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Container>
      <Section>
        <Title>내 프로필</Title>

        <RewardPanel aria-label="순금 보너스 적립 내역">
          <RewardTitle><span aria-hidden="true">✨</span> 순금 보너스</RewardTitle>
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
                      ? ` · ${goldBonus.usage.visitDate} ${goldBonus.usage.visitTime || ""}`
                      : ""}
                  </span>
                  {goldBonus.usage.status === "requested" && (
                    <>
                      <span>매장에서 아래 6자리 코드를 관리자에게 보여주세요.</span>
                      <RewardCode aria-label={`매장 확인 코드 ${goldBonus.usage.requestCode}`}>
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
                      현장 인정 {Number(goldBonus.usage.finalRecognizedG || 0).toFixed(3)}g
                      {" + "}적립 {Number(goldBonus.usage.amountG || 0).toFixed(2)}g
                      {" = "}최종 {Number(goldBonus.usage.finalAppliedG || 0).toFixed(3)}g
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
                  {bonusUsageOpen && goldBonus.usage?.status !== "requested" && (
                    <RewardUsagePanel>
                      <label htmlFor="bonus-exchange-group"><b>사용할 금교환 예약</b></label>
                      <RewardSelect
                        id="bonus-exchange-group"
                        value={selectedBonusGroupId}
                        onChange={(event) => setSelectedBonusGroupId(event.target.value)}
                      >
                        {goldBonus.eligibleGroups.map((group) => (
                          <option key={group.groupId} value={group.groupId}>
                            {group.visitDate || "방문일 미정"} {group.visitTime || ""} · {
                              group.status === "requested" ? "접수" :
                              group.status === "scheduled" ? "예약 승인" : "진행 중"
                            }
                          </option>
                        ))}
                      </RewardSelect>
                      <RewardNote>현재 보유한 적립 순금 전액을 선택한 교환 건에 신청합니다.</RewardNote>
                      <RewardAction
                        type="button"
                        disabled={bonusActionBusy || !selectedBonusGroupId}
                        onClick={handleBonusUsageRequest}
                      >
                        {bonusActionBusy ? "신청 중…" : `${goldBonus.balanceG.toFixed(2)}g 사용 신청`}
                      </RewardAction>
                    </RewardUsagePanel>
                  )}
                </>
              )}

              {canRequestBonus && goldBonus.eligibleGroups.length === 0 && !goldBonus.usageUnavailable && (
                <RewardLink to="/gold-exchange">금교환 예약 후 사용 신청</RewardLink>
              )}
              {bonusActionError && <RewardError role="alert">{bonusActionError}</RewardError>}
              <RewardNote>
                웰컴 순금과 퀵퀴즈 적립 순금은 골드바 교환 시 중량으로 더해집니다.
                현금 환급·양도는 불가하며, 매장에서 본인과 최종 인정 중량을 확인한 뒤 사용이 확정됩니다.
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
                {!(!initialNickname) && (
                  <small style={{ color: "#888", fontWeight: 400 }}>
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
              <Button type="button" onClick={() => setEditing(false)}>
                취소
              </Button>
            </ButtonRow>
          </Form>
        ) : (
          <div>
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
            <Button onClick={() => setEditing(true)}>프로필 수정</Button>
          </div>
        )}
      </Section>

      <Section>
        <Title>거래 평가 내역</Title>
        <TransactionReviewsSummary sellerId={user.uid} />
      </Section>

      <Divider />

      <Section>
        <Title>비밀번호 변경</Title>
        {pwdError && <MessageText $error>{pwdError}</MessageText>}
        {pwdMessage && <MessageText>{pwdMessage}</MessageText>}

        <Form onSubmit={handlePasswordSubmit} autoComplete="on">
          <VisuallyHidden
            type="text"
            name="username"
            autoComplete="username"
            defaultValue={user?.email || profile.email || ""}
            aria-hidden="true"
            tabIndex={-1}
          />

          <FormGroup>
            <Label htmlFor="currentPassword">현재 비밀번호</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </FormGroup>

          <Button type="submit" disabled={changingPwd}>
            {changingPwd ? "변경중..." : "비밀번호 변경"}
          </Button>
        </Form>
      </Section>

      <Divider />

      <Section>
        <Title>계정 탈퇴</Title>
        {deleteErr && <MessageText $error>{deleteErr}</MessageText>}
        {deleteMsg && <MessageText>{deleteMsg}</MessageText>}

        <p style={{ lineHeight: 1.6, color: "#555" }}>
          탈퇴 시 계정과 공개 프로필은 <strong>비식별 처리</strong>됩니다.
          완료된 교환 및 고객문의 기록은 관련 법령과 개인정보처리방침에 따라
          필요한 기간 동안 보존될 수 있습니다.
        </p>

        <Form onSubmit={handleDeleteAccount} autoComplete="on">
          <VisuallyHidden
            type="text"
            name="username"
            autoComplete="username"
            defaultValue={user?.email || profile.email || ""}
            aria-hidden="true"
            tabIndex={-1}
          />

        <FormGroup>
            <Label htmlFor="deletePwd">현재 비밀번호</Label>
            <Input
              id="deletePwd"
              name="deletePwd"
              type="password"
              value={deletePwd}
              onChange={(e) => setDeletePwd(e.target.value)}
              autoComplete="current-password"
              required
            />
          </FormGroup>

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              margin: "8px 0 16px",
            }}
          >
            <input
              type="checkbox"
              checked={deleteAgree}
              onChange={(e) => setDeleteAgree(e.target.checked)}
            />
            <span>안내 사항을 모두 확인했으며 계정을 영구 삭제합니다.</span>
          </label>

          <DangerButton type="submit" disabled={deleting}>
            {deleting ? "탈퇴 처리 중..." : "계정 탈퇴"}
          </DangerButton>
        </Form>
      </Section>
    </Container>
  );
}
