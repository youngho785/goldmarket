// src/pages/TransactionReview.js
import React, { useState } from "react";
import { updateUserProfile, fetchUserProfile } from "../services/userService";

export default function TransactionReview({ targetUserId }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // 여기서는 단순히 targetUserId의 프로필에 평가 정보를 추가하는 예시입니다.
  // 실제로는 거래 리뷰 테이블을 별도로 관리하고, 사용자 프로필의 신뢰도를 계산하는 로직이 필요합니다.
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 기존 사용자 프로필을 가져와서, 평점과 리뷰 정보를 업데이트합니다.
      const profile = await fetchUserProfile(targetUserId);
      const newReview = { rating, comment, date: new Date().toISOString() };

      // 기존 평점 정보가 있다면 평점 배열에 추가하거나, 단순 평균 평점을 업데이트하는 방식으로 처리할 수 있습니다.
      // 여기서는 간단하게 "lastReview" 필드로 저장합니다.
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
          />
        </div>
        <button type="submit">평가 제출</button>
      </form>
    </div>
  );
}
