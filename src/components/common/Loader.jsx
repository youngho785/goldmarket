import React from "react";

export default function Loader() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: 72,
        display: "grid",
        placeItems: "center",
        padding: 16,
        color: "var(--gm-text-secondary)",
        fontSize: "0.9rem",
      }}
    >
      불러오는 중…
    </div>
  );
}
