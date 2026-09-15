//src/components/reviews/GoldExchangeReviewForm.jsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  getMyGoldExchangeReview,
  submitGoldExchangeReview,
} from "@/services/goldExchangeReviewClient";

const Panel = styled.section`
  margin-top: 22px;
  padding: clamp(20px, 4vw, 28px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;

  h3 {
    margin: 0 0 6px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.15rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.86rem;
    line-height: 1.55;
    word-break: keep-all;
  }

  @media (max-width: 520px) {
    gap: 12px;
  }
`;

const Verified = styled.span`
  flex: 0 0 auto;
  padding: 6px 9px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.secondaryDark};
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.7rem;
  font-weight: 850;
  white-space: nowrap;
`;

const RatingGroup = styled.fieldset`
  margin: 0 0 18px;
  padding: 0;
  border: 0;

  legend {
    margin-bottom: 10px;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
  }
`;

const Stars = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`;

const StarLabel = styled.label`
  cursor: pointer;

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  span {
    display: grid;
    place-items: center;
    width: 44px;
    height: 42px;
    border: 1px solid
      ${({ theme, $active }) =>
        $active ? theme.colors.secondary : theme.colors.border};
    background: ${({ theme, $active }) =>
      $active ? theme.colors.goldLight : theme.colors.surface};
    color: ${({ theme, $active }) =>
      $active ? theme.colors.secondaryDark : theme.colors.textLight};
    font-size: 1.2rem;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      color 0.15s ease;
  }

  input:focus-visible + span {
    outline: 2px solid ${({ theme }) => theme.focus.outline};
    outline-offset: 2px;
  }
`;

const FieldLabel = styled.label`
  display: inline-block;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.primary};
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 130px;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  line-height: 1.65;
  resize: vertical;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.secondary};
  }
`;

const FormMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.76rem;

  @media (max-width: 520px) {
    align-items: flex-end;

    span:first-child {
      max-width: 75%;
    }
  }
`;

const Submit = styled.button`
  width: 100%;
  min-height: 50px;
  margin-top: 17px;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 850;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryDark};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
`;

const Message = styled.p`
  margin: 13px 0 0;
  color: ${({ theme, $error }) =>
    $error ? theme.colors.error : theme.colors.success};
  font-size: 0.86rem;
  line-height: 1.5;
`;

const LoadingText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.86rem;
`;

const ExistingRating = styled.div`
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 1.08rem;
  letter-spacing: 0.08em;
`;

const ExistingComment = styled.blockquote`
  margin: 14px 0 0;
  padding: 16px 18px;
  border-left: 3px solid ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
  line-height: 1.7;
  word-break: keep-all;
`;

const ratingLabel = (rating) => `${rating}점`;

function normalizeRating(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(5, Math.max(0, Math.round(number)));
}

export default function GoldExchangeReviewForm({ exchangeId, status }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(status === "completed");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;

    setMessage("");
    setIsError(false);

    if (!exchangeId || status !== "completed") {
      setLoading(false);

      return () => {
        active = false;
      };
    }

    setLoading(true);

    getMyGoldExchangeReview(exchangeId)
      .then((review) => {
        if (!active) return;
        setExisting(review);
      })
      .catch((error) => {
        console.error("교환 후기 확인 실패:", error);

        if (active) {
          setIsError(true);
          setMessage(
            "후기 작성 여부를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [exchangeId, status]);

  if (status !== "completed") return null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    const cleanComment = comment.trim();

    setMessage("");
    setIsError(false);

    if (cleanComment.length < 10) {
      setIsError(true);
      setMessage("후기를 10자 이상 입력해 주세요.");
      return;
    }

    if (cleanComment.length > 500) {
      setIsError(true);
      setMessage("후기는 500자 이하로 입력해 주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitGoldExchangeReview({
        exchangeId,
        rating,
        comment: cleanComment,
      });

      if (!result?.ok) {
        throw new Error("후기 등록 결과를 확인하지 못했습니다.");
      }

      setExisting({
        id: result.reviewId,
        rating,
        comment: cleanComment,
        reviewerLabel: "교환 완료 고객",
        verified: true,
        createdAt: new Date(),
      });

      setComment("");
      setMessage("교환 후기가 등록되었습니다.");
    } catch (error) {
      console.error("교환 후기 등록 실패:", error);

      setIsError(true);

      if (error?.code === "already-exists") {
        setMessage("이 교환 건에는 이미 후기가 등록되어 있습니다.");
      } else if (error?.code === "failed-precondition") {
        setMessage("교환 완료 처리된 건만 후기를 작성할 수 있습니다.");
      } else if (error?.code === "permission-denied") {
        setMessage("본인의 교환 내역에만 후기를 작성할 수 있습니다.");
      } else if (error?.code === "unauthenticated") {
        setMessage("로그인 후 후기를 작성해 주세요.");
      } else {
        setMessage("후기 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const existingRating = normalizeRating(existing?.rating);

  return (
    <Panel aria-labelledby={`review-title-${exchangeId}`}>
      <Head>
        <div>
          <h3 id={`review-title-${exchangeId}`}>교환 후기</h3>
          <p>
            실제 교환이 완료된 고객만 해당 교환 건에 대해 한 번 작성할 수
            있습니다.
          </p>
        </div>

        <Verified>교환 완료 확인</Verified>
      </Head>

      {loading ? (
        <LoadingText>후기 작성 여부를 확인하는 중입니다.</LoadingText>
      ) : existing ? (
        <>
          <ExistingRating aria-label={`평점 ${existingRating}점`}>
            {"★".repeat(existingRating)}
            {"☆".repeat(5 - existingRating)}
          </ExistingRating>

          <ExistingComment>“{existing.comment}”</ExistingComment>

          {message && (
            <Message $error={isError} role="status" aria-live="polite">
              {message}
            </Message>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <RatingGroup>
            <legend>이번 교환 경험은 어떠셨나요?</legend>

            <Stars>
              {[1, 2, 3, 4, 5].map((value) => (
                <StarLabel key={value} $active={value <= rating}>
                  <input
                    type="radio"
                    name={`exchange-rating-${exchangeId}`}
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    aria-label={ratingLabel(value)}
                  />
                  <span aria-hidden="true">★</span>
                </StarLabel>
              ))}
            </Stars>
          </RatingGroup>

          <FieldLabel htmlFor={`exchange-review-${exchangeId}`}>
            <strong>후기 내용</strong>
          </FieldLabel>

          <Textarea
            id={`exchange-review-${exchangeId}`}
            value={comment}
            onChange={(event) =>
              setComment(event.target.value.slice(0, 500))
            }
            maxLength={500}
            placeholder="교환 과정에서 좋았던 점이나 도움이 된 점을 알려주세요."
            required
          />

          <FormMeta>
            <span>연락처·주소·접수번호 등 개인정보는 입력하지 마세요.</span>
            <span>{comment.length}/500</span>
          </FormMeta>

          <Submit
            type="submit"
            disabled={submitting || comment.trim().length < 10}
          >
            {submitting ? "등록 중..." : "교환 후기 등록"}
          </Submit>

          {message && (
            <Message $error={isError} role="status" aria-live="polite">
              {message}
            </Message>
          )}
        </form>
      )}
    </Panel>
  );
}