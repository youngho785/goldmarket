// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ChevronRight } from "lucide-react";
import { getAuth, updateProfile as updateAuthProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { useAuthContext } from "../context/AuthContext";
import { fetchMyProfile, updateUserProfile } from "../services/userService";
import { requestEmailChange } from "../services/authService";
import { storage } from "../firebase/firebase";
import Loader from "../components/common/Loader";
import { compressImage } from "../utils/imageCompression";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";

/* ───────────── Styled ───────────── */
const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 7px 0 28px;
  color: ${({ theme }) => theme.colors.text};
`;


const ProfileHero = styled.header`
  position: relative;
  margin-bottom: 10px;
  padding: clamp(21px, 4vw, 30px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.primary} 78%, transparent);
  border-radius: 22px;
  background:
    radial-gradient(circle at 92% 8%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, transparent) 0, transparent 31%),
    ${({ theme }) => theme.gradients.primary};
  box-shadow: 0 12px 30px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);

  &::after {
    content: "G";
    position: absolute;
    right: -8px;
    bottom: -34px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 7%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 7.4rem;
    font-weight: 950;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 560px) {
    padding: 17px 15px 15px;
    border-radius: 19px;
  }
`;

const ProfileEyebrow = styled.p`
  position: relative;
  z-index: 1;
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: .61rem;
  font-weight: 950;
  letter-spacing: .14em;
`;

const ProfileHeroTitle = styled.h1`
  position: relative;
  z-index: 1;
  margin: 0;
  color: ${({ theme }) => theme.on.primary};
  font-size: clamp(1.55rem, 4vw, 2.15rem);
  line-height: 1.14;
  letter-spacing: -.04em;
`;

const ProfileHeroLead = styled.p`
  position: relative;
  z-index: 1;
  margin: 8px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 68%, transparent);
  font-size: .76rem;
  line-height: 1.5;
`;

const Section = styled.section`
  margin-bottom: 12px;
  padding: clamp(18px, 4vw, 25px);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  box-shadow: 0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

  @media (max-width: 560px) {
    padding: 16px 14px;
    border-radius: 18px;
  }
`;

const Title = styled.h1`
  margin: 0 0 18px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.35rem, 4vw, 1.75rem);
  line-height: 1.2;
  letter-spacing: -.03em;
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
  margin-bottom: 6px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: .86rem;
  font-weight: 850;
`;

const Input = styled.input`
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: .96rem;

  &[disabled] {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  &:focus {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 25%, transparent);
    outline-offset: 1px;
    border-color: ${({ theme }) => theme.colors.secondary};
  }
`;

const ImgPreview = styled.img`
  width: 96px;
  height: 96px;
  margin: 2px 0 10px;
  object-fit: cover;
  border: 3px solid ${({ theme }) => theme.colors.surface};
  border-radius: 50%;
  outline: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: 560px) {
    width: 88px;
    height: 88px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const Button = styled.button`
  min-height: 46px;
  padding: 10px 15px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 11px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: .94rem;
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:hover:enabled {
    filter: brightness(1.03);
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
  gap: 0;

  p {
    display: grid;
    grid-template-columns: 78px minmax(0, 1fr);
    gap: 8px;
    margin: 0;
    padding: 10px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
    color: ${({ theme }) => theme.colors.text};
    font-size: .9rem;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  p strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 900;
    white-space: nowrap;
  }

  ${ButtonRow} {
    margin-top: 14px;
  }

  @media (max-width: 420px) {
    p {
      grid-template-columns: 68px minmax(0, 1fr);
      gap: 7px;
      font-size: .86rem;
    }
  }
`;

const EmailChangePanel = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
    line-height: 1.5;
  }
`;

const RewardPanel = styled.div`
  display: grid;
  gap: 9px;
  margin-bottom: 20px;
  padding: 15px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 25%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 72%, white),
      ${({ theme }) => theme.colors.surface}
    );
  color: ${({ theme }) => theme.colors.text};
`;

const RewardTitle = styled.strong`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: .98rem;
  font-weight: 900;
`;


const RewardSummary = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .78rem;
  font-weight: 850;
  white-space: nowrap;
`;




const RewardNote = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.86rem;
  line-height: 1.6;
`;


const RewardLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 43px;
  padding: 9px 13px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 850;
  text-decoration: none;
`;






const MyHub = styled.nav`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const MyHubLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 12px 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => theme.colors.secondary};
  }

  > span { display: grid; gap: 3px; }
  strong { color: ${({ theme }) => theme.colors.primary}; font-size: .9rem; }
  small { color: ${({ theme }) => theme.colors.textSecondary}; font-size: .72rem; line-height: 1.4; }
  svg { width: 17px; height: 17px; color: ${({ theme }) => theme.colors.secondaryDark}; }
`;
const SettingsShortcut = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => theme.colors.secondary};
  }

  > span {
    display: grid;
    gap: 3px;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: .94rem;
  }

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .78rem;
    line-height: 1.45;
  }

  svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.secondaryDark};
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
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [initialNickname, setInitialNickname] = useState("");
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const { balanceG: memberGoldBalanceG, loading: memberGoldLoading } = useBonusGoldBalance(user?.uid);

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
          phone: formatPhone(data?.phone || ""),
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
    setPhotoStatus("선택한 사진을 준비하고 있습니다.");
    setMessage("");
    setError("");

    try {
      // Android Photo Picker/모바일 브라우저의 임시 URI에 오래 의존하지 않도록
      // 선택 직후 파일 바이트를 메모리 기반 File로 복사합니다.
      const fileBytes = await file.arrayBuffer();
      let uploadFile = new File([fileBytes], file.name || "profile-image", {
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified || Date.now(),
      });

      // 작은 이미지는 압축 시간을 쓰지 않고 바로 업로드합니다.
      // 큰 이미지만 프로필 용도에 맞게 가볍게 최적화합니다.
      const DIRECT_UPLOAD_MAX_BYTES = 2_500_000;
      if (uploadFile.size > DIRECT_UPLOAD_MAX_BYTES) {
        setPhotoStatus("프로필 사진에 맞게 이미지를 최적화하고 있습니다.");
        try {
          uploadFile = await compressImage(uploadFile, {
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
        }
      }

      setPhotoStatus("프로필 사진을 업로드하고 있습니다.");

      const extFromName = (uploadFile.name.split(".").pop() || "").toLowerCase();
      const safeExt = extFromName || mimeToExt(uploadFile.type);
      const path = `profilePhotos/${user.uid}/${Date.now()}.${safeExt}`;

      const storageRef = ref(storage, path);
      const uploadSnapshot = await uploadBytes(storageRef, uploadFile, {
        contentType: uploadFile.type,
        cacheControl: "private,max-age=31536000,immutable",
      });

      const url = await getDownloadURL(uploadSnapshot.ref);
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

    const normalizedPhone = formatPhone(profile.phone);
    if (!validatePhone(normalizedPhone)) {
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
        phone: normalizedPhone || "",
        photoURL: profile.profileImage || "",
        profileImage: profile.profileImage || "",
      });

      const authUserToSync = auth.currentUser;
      setProfile((current) => ({ ...current, phone: normalizedPhone }));

      if (canSetNicknameFirstTime) {
        setInitialNickname(profile.nickname || "");
      }

      // Firestore 프로필 저장이 끝나면 사용자는 즉시 완료 상태를 봅니다.
      // Firebase Auth의 displayName/photoURL 동기화는 보조 정보이므로
      // 네트워크가 느려도 프로필 저장 화면을 붙잡지 않도록 백그라운드에서 동기화합니다.
      setMessage("프로필이 저장되었습니다.");
      setError("");
      setEditing(false);

      if (authUserToSync) {
        void updateAuthProfile(authUserToSync, {
          displayName: profile.displayName || "",
          photoURL: profile.profileImage || null,
        }).catch((syncError) => {
          console.warn("Auth 프로필 동기화 지연:", syncError?.message || syncError);
        });
      }
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
      <ProfileHero>
        <ProfileHeroTitle>MY</ProfileHeroTitle>
        <ProfileHeroLead>
          MY GOLD, 교환 내역, MEMBER GOLD, 고객지원과 계정 설정을 한곳에서 관리합니다.
        </ProfileHeroLead>
      </ProfileHero>

      <MyHub aria-label="MY 주요 메뉴">
        <MyHubLink to="/my-exchanges">
          <span><strong>예약·교환 내역</strong><small>진행 중 예약과 지난 교환 기록을 확인합니다.</small></span>
          <ChevronRight aria-hidden="true" />
        </MyHubLink>
        <MyHubLink to="/support">
          <span><strong>고객지원 · 1:1 문의</strong><small>문의 작성과 답변 상태를 확인합니다.</small></span>
          <ChevronRight aria-hidden="true" />
        </MyHubLink>
        <MyHubLink to="/reviews">
          <span><strong>교환 완료 고객 후기</strong><small>실제 교환 완료가 확인된 후기를 봅니다.</small></span>
          <ChevronRight aria-hidden="true" />
        </MyHubLink>
        <MyHubLink to="/stores">
          <span><strong>매장·이용 안내</strong><small>매장 위치, 이용 방법과 교환 정보를 확인합니다.</small></span>
          <ChevronRight aria-hidden="true" />
        </MyHubLink>
      </MyHub>

      <Section>
        <RewardPanel aria-label="MEMBER GOLD 요약">
          <RewardTitle>
            <span aria-hidden="true">✨</span>
            MEMBER GOLD
          </RewardTitle>
          <RewardSummary>
            {memberGoldLoading
              ? "잔액 확인 중"
              : `MEMBER GOLD 잔액 ${Number(memberGoldBalanceG || 0).toFixed(2)}g`}
          </RewardSummary>
          <RewardNote>
            회원혜택으로 받은 순금입니다. MY GOLD와는 별도로 관리되며 GOLD TO GOLD 교환 시 사용할 수 있습니다.
          </RewardNote>
          <RewardLink to="/member-gold">
            내 MEMBER GOLD 보기
            <ChevronRight aria-hidden="true" />
          </RewardLink>
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
