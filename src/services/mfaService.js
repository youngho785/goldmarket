import {
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  getMultiFactorResolver,
  multiFactor,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

let verifier = null;

function resetVerifier() {
  if (verifier) {
    try {
      verifier.clear();
    } catch {
      // 이미 제거된 reCAPTCHA 인스턴스는 무시합니다.
    }
  }
  verifier = null;
}

function createVerifier(containerId) {
  resetVerifier();
  verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
  return verifier;
}

export function getMfaFactors(user = auth.currentUser) {
  if (!user) return [];
  return multiFactor(user).enrolledFactors.map((factor) => ({
    uid: factor.uid,
    displayName: factor.displayName || "관리자 휴대전화",
    phoneNumber: factor.phoneNumber || "",
    factorId: factor.factorId,
  }));
}

export async function beginMfaEnrollment(phoneNumber, containerId) {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  const session = await multiFactor(user).getSession();
  const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber(
    { phoneNumber, session },
    createVerifier(containerId)
  );
  return { verificationId };
}

export async function completeMfaEnrollment(
  challenge,
  verificationCode,
  displayName = "관리자 휴대전화"
) {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  const credential = PhoneAuthProvider.credential(
    challenge.verificationId,
    String(verificationCode || "").trim()
  );
  const assertion = PhoneMultiFactorGenerator.assertion(credential);
  await multiFactor(user).enroll(assertion, displayName);
  resetVerifier();
  await user.getIdToken(true);
  return getMfaFactors(user);
}

export async function beginMfaSignIn(error, containerId) {
  const resolver = getMultiFactorResolver(auth, error);
  const hint = resolver.hints[0];
  if (!hint) throw new Error("등록된 2차 인증 수단을 찾을 수 없습니다.");
  const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber(
    { multiFactorHint: hint, session: resolver.session },
    createVerifier(containerId)
  );
  return {
    resolver,
    verificationId,
    phoneNumber: hint.phoneNumber || "",
  };
}

export async function completeMfaSignIn(challenge, verificationCode) {
  const credential = PhoneAuthProvider.credential(
    challenge.verificationId,
    String(verificationCode || "").trim()
  );
  const assertion = PhoneMultiFactorGenerator.assertion(credential);
  const result = await challenge.resolver.resolveSignIn(assertion);
  resetVerifier();
  return result.user;
}
