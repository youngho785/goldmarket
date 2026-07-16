// src/components/common/ErrorBoundary.jsx
import React from "react";

/**
 * ErrorBoundary
 * - 런타임 에러를 잡아 안전한 fallback UI를 보여줍니다.
 * - props:
 *   - fallback?: ReactNode            // 커스텀 대체 UI
 *   - onError?: (error, info) => void // 에러 후킹(옵션)
 *
 * Sentry를 사용 중이면 글로벌로 노출된 Sentry를 자동 사용합니다.
 * (ex. main.jsx에서 sentry.client.js를 import하여 globalThis.Sentry 설정)
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // 개발 중 콘솔 출력
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error, info);
    }

    // 콜백 훅
    try { this.props.onError?.(error, info); } catch {}

    // Sentry가 전역에 있으면(선택)
    const Sentry = globalThis?.Sentry;
    if (Sentry?.captureException) {
      try { Sentry.captureException(error, { extra: info }); } catch {}
    }
  }

  // 필요 시 상태를 초기화할 수 있도록 메서드 제공
  reset = () => this.setState({ hasError: false, error: null, info: null });

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback 우선
      if (this.props.fallback) return this.props.fallback;

      // 기본 fallback UI
      return (
        <div style={{ padding: 24 }}>
          <h2>문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</h2>
          {import.meta.env.DEV && (
            <pre style={{ whiteSpace: "pre-wrap", color: "#666" }}>
              {String(this.state.error)}
            </pre>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => location.reload()}>새로고침</button>
            <button onClick={this.reset}>다시 시도</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
