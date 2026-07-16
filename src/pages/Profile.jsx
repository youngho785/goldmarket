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

/* ───────────── Styled ───────────── */
const Container = styled.div`
  padding: 40px 20px;
  max-width: 600px;
  margin: auto;
  color: ${({ theme }) => theme.colors.text || "#333"};
`;
const Title = styled.h1`
  margin-bottom: 24px;
  color: ${({ theme }) => theme.colors.primary || "#007bff"};
`;
const Section = styled.section`
  margin-bottom: 32px;
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
  font-weight: 600;
  margin-bottom: 8px;
`;
const Input = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  &[disabled] {
    background: #f5f5f5;
  }
`;
const ImgPreview = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 50%;
  margin-top: 8px;
`;
const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
`;
const Button = styled.button`
  padding: 10px 16px;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  &:disabled {
    background: #aaa;
    cursor: not-allowed;
  }
  &:hover:enabled {
    background: ${({ theme }) => theme.colors.primaryDark || "#0056b3"};
  }
`;
const DangerButton = styled(Button)`
  background: #e11d48;
  &:hover:enabled {
    background: #be123c;
  }
`;
const MessageText = styled.p`
  color: ${({ $error }) => ($error ? "#d9534f" : "#5cb85c")};
  margin-bottom: 16px;
`;
const Divider = styled.hr`
  margin: 32px 0;
  border: none;
  border-top: 1px solid #e0e0e0;
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

/* ▶ 가입 혜택 배지 (고정 표기) */
const RewardBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border || "#e5e7eb"};
  background: ${({ theme }) => theme.colors.surface || "#fff"};
  color: ${({ theme }) => theme.colors.success || "#10b981"};
  font-weight: 800;
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
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw) || !/[!@#$%^&*()_+{};':\",.<>/?\\|`~-]/.test(pw)) {
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

        {/* ▶ 가입 혜택 표기만 고정 노출 */}
        <div style={{ margin: "0 0 12px" }}>
          <RewardBadge aria-label="가입 혜택 적립">
            <span role="img" aria-label="sparkles">✨</span>
            가입 혜택: <b>0.01g 적립</b>
          </RewardBadge>
        </div>

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
          탈퇴 시 공개 프로필은 <strong>비식별 처리</strong>되며,
          채팅 목록에서는 본인 상태가 <strong>숨김/나가기</strong>로 표시됩니다.
          일부 거래/게시글 기록은 서비스 안전을 위해 보존될 수 있습니다.
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
