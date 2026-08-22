// src/hooks/useGuardAction.js
import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { useLoginGate } from "@/context/LoginGateContext";

/**
 * 로그인/인증이 필요한 액션을 보호합니다.
 * 페이지 이동이 생기는 인증 흐름은 현재 내부 경로를 next로 전달합니다.
 */
export default function useGuardAction() {
  const { user, isEmailVerified } = useAuthContext();
  const { openGate } = useLoginGate();
  const location = useLocation();

  const stopEventIfNeeded = (arg0) => {
    const evt = arg0;
    const isEvt =
      evt &&
      typeof evt === "object" &&
      (typeof evt.preventDefault === "function" ||
        (evt.nativeEvent &&
          typeof evt.nativeEvent.preventDefault === "function"));

    if (isEvt) {
      evt.preventDefault?.();
      evt.stopPropagation?.();
    }
  };

  const makeSafeEvent = () => ({
    preventDefault() {},
    stopPropagation() {},
  });

  return useCallback(
    (fn, { requireVerified = true, intent } = {}) =>
      (...args) => {
        const needLogin = !user;
        const needVerify =
          !needLogin && requireVerified && !isEmailVerified;

        if (needLogin || needVerify) {
          stopEventIfNeeded(args[0]);

          const next =
            `${location.pathname}${location.search}${location.hash}` || "/";

          openGate({
            title: needLogin
              ? "로그인이 필요합니다"
              : "이메일 인증이 필요합니다",
            message: needLogin
              ? "계속하시려면 로그인 또는 회원가입을 완료해 주세요."
              : "인증을 완료하시면 원래 화면으로 돌아옵니다.",
            requireVerified,
            intent,
            next,
            afterAuth: () => {
              const firstArg = args[0];
              const safeArgs =
                firstArg &&
                typeof firstArg === "object" &&
                typeof firstArg.preventDefault === "function"
                  ? [makeSafeEvent(), ...args.slice(1)]
                  : args;

              return fn(...safeArgs);
            },
          });

          return;
        }

        return fn(...args);
      },
    [
      user,
      isEmailVerified,
      openGate,
      location.pathname,
      location.search,
      location.hash,
    ]
  );
}
