// src/hooks/useGuardAction.jsx
import { useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useLoginGate } from "@/context/LoginGateContext";

/**
 * 어떤 핸들러든 감싸서, 로그인/인증이 필요하면
 * - 이벤트 기본동작을 막고 (폼 제출/전파 방지)
 * - 모달을 띄우고
 * - 로그인/인증 완료 즉시 원래 액션을 재실행합니다.
 *
 * 사용법:
 *   const guard = useGuardAction();
 *   const onSubmit = guard(handleSubmit, { requireVerified: false, intent: "exchange-calc" });
 *   <form onSubmit={onSubmit}>...</form>
 */
export default function useGuardAction() {
  const { user, isEmailVerified } = useAuthContext();
  const { openGate } = useLoginGate();

  // 폼/버튼 이벤트면 기본동작을 안전하게 막기
  const stopEventIfNeeded = (arg0) => {
    const evt = arg0;
    const isEvt =
      evt &&
      typeof evt === "object" &&
      (typeof evt.preventDefault === "function" ||
        (evt.nativeEvent && typeof evt.nativeEvent.preventDefault === "function"));

    if (isEvt) {
      evt.preventDefault?.();
      evt.stopPropagation?.();
    }
  };

  // 로그인 후 재실행 시 onSubmit 같은 핸들러가 e.preventDefault()를 호출해도 오류 없도록 더미 이벤트 제공
  const makeSafeEvent = () => ({
    preventDefault() {},
    stopPropagation() {},
  });

  return useCallback(
    (fn, { requireVerified = true, intent } = {}) =>
      (...args) => {
        const needLogin = !user;
        const needVerify = !needLogin && requireVerified && !isEmailVerified;

        if (needLogin || needVerify) {
          // 1) 지금 이벤트의 기본동작/전파를 즉시 중단
          stopEventIfNeeded(args[0]);

          // 2) 로그인 모달 열면서, 로그인/인증 성공 시 재실행할 콜백을 등록
          openGate({
            title: needLogin ? "로그인이 필요합니다" : "이메일 인증이 필요합니다",
            message: needLogin
              ? "계속하시려면 로그인 또는 회원가입을 완료해 주세요."
              : "인증을 완료하시면 바로 계속됩니다.",
            requireVerified, // true면 인증까지 요구
            intent,          // 트래킹/분석용
            afterAuth: () => {
              // 폼 onSubmit 같은 시나리오에서도 안전하게 동작하도록 더미 이벤트 주입
              const firstArg = args[0];
              const safeArgs =
                firstArg && typeof firstArg === "object" && typeof firstArg.preventDefault === "function"
                  ? [makeSafeEvent(), ...args.slice(1)]
                  : args;

              return fn(...safeArgs);
            },
          });

          return; // 원래 액션은 지금은 실행하지 않음
        }

        // 통과 → 즉시 실행
        return fn(...args);
      },
    [user, isEmailVerified, openGate]
  );
}
