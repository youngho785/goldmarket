// src/pages/TransactionReview.js
import React, { useState } from "react";
import { updateUserProfile } from "../services/userService"; // fetchUserProfile 제거

export default function TransactionReview({ targetUserId }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // targetUserId의 프로필에 평가 정보를 업데이트하는 예시입니다.
  // 실제로는 거래 리뷰 테이블을 별도로 관리하는 것이 좋습니다.
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newReview = { rating, comment, date: new Date().toISOString() };
      await updateUserProfile(targetUserId, {
        lastReview: newReview,
      });
      setSubmitted(true);
    } catch (err) {
      setError("평가 제출에 실패했습니다.");
      console.error(err);
    }
  };

  if (submitted) return <p>평가가 완료되었습니다. 감사합니다!</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>거래 평가</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>평점: </label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((val) => (
              <option key={val} value={val}>
                {val}점
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>코멘트: </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="거래 후 의견을 남겨주세요."
            required
            rows={4}
            style={{ width: "100%" }}
          ></textarea>
        </div>
        <button type="submit">평가 제출</button>
      </form>
    </div>
  );
}
