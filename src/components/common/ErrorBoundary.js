// src/components/common/ErrorBoundary.js
import React from "react";
import * as Sentry from "@sentry/react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>문제가 발생했습니다. 잠시 후 다시 시도해주세요.</h1>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
