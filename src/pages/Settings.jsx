// src/pages/Settings.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Actions,
  Button,
  Container,
  DangerButton,
  DangerDetails,
  DangerNote,
  DetailsBody,
  Form,
  FormGroup,
  Input,
  Intro,
  Label,
  LinkList,
  Message,
  PageHeader,
  Section,
  SectionDescription,
  SectionTitle,
  SettingDetails,
  SettingLink,
  Title,
} from "../components/settings/Settings.styles";
import { ChevronRight, ShieldCheck } from "lucide-react";
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";

import { useAuthContext } from "../context/AuthContext";
import { callDeleteMyAccount } from "../firebase/firebase";
import SettingsNotificationsSection from "../components/settings/SettingsNotificationsSection";

/* ───────────── Utils ───────────── */
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
         * 계정 삭제 가능 여부는 서버가 먼저 판정합니다.
         * 진행 중 예약·교환으로 탈퇴가 차단되는 경우
         * 푸시 구독 등 현재 계정 상태를 먼저 변경하지 않습니다.
         */
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
        const errorReason = String(
          error?.details?.reason || ""
        );

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
            "failed-precondition" &&
          errorReason ===
            "active-exchange"
        ) {
          setDeleteErr(
            "진행 중인 예약·교환이 있어 탈퇴할 수 없습니다. 해당 건을 완료하거나 정상 취소한 뒤 다시 시도해 주세요."
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

  return (
    <Container>
      <PageHeader>
        <Title>설정</Title>

        <Intro>
          필요한 설정만 간단히 관리합니다.
        </Intro>
      </PageHeader>

      <SettingsNotificationsSection user={user} />

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
              알림, 프로필 사진은 삭제됩니다.
              진행 중인 예약·교환 또는 미완료
              처리가 있는 경우에는 탈퇴할 수
              없으며, 해당 건을 완료하거나 정상
              취소한 뒤 다시 진행해야 합니다.
              완료된 교환 및 고객문의 기록은
              관련 법령과 분쟁 대응을 위해
              필요한 기간 동안 식별정보를
              제거한 상태로 보존될 수 있습니다.
              사용하지 않은 적립 순금 잔액은
              같은 인증 이메일로 재가입할 때
              복원할 수 있도록 가명 처리된
              승계 기록으로 별도 보관되며,
              회원가입·퀴즈·알림 혜택은 다시
              지급되지 않습니다.
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
