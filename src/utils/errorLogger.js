// src/utils/errorLogger.js
export function logError(error, info = {}) {
    fetch("/logError", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        timestamp: new Date().toISOString(),
      }),
    });
  }
  
