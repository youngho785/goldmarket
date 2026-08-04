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
  margin-bottom: 18px;

  h3 {
    margin: 0 0 5px;
    color: ${({ theme }) => theme.colors.primary};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .88rem;
  }
`;

const Verified = styled.span`
  flex: 0 0 auto;
  padding: 6px 9px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .72rem;
  font-weight: 850;
`;

const RatingGroup = styled.fieldset`
  margin: 0 0 16px;
  padding: 0;
  border: 0;

  legend {
    margin-bottom: 8px;
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
    min-width: 44px;
    min-height: 42px;
    border: 1px solid ${({ theme, $active }) =>
      $active ? theme.colors.secondary : theme.colors.border};
    background: ${({ theme, $active }) =>
      $active ? theme.colors.goldLight : theme.colors.surface};
    color: ${({ theme, $active }) =>
      $active ? theme.colors.secondaryDark : theme.colors.textLight};
    font-size: 1.2rem;
  }

  input:focus-visible + span {
    outline: 2px solid ${({ theme }) => theme.focus.outline};
    outline-offset: 2px;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 130px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  resize: vertical;
`;

const FormMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 7px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .78rem;
`;

const Submit = styled.button`
  width: 100%;
  min-height: 48px;
  margin-top: 16px;
  padding: 11px 16px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 850;

  &:disabled {
    cursor: not-allowed;
    opacity: .58;
  }
`;

const Message = styled.p`
  margin: 12px 0 0;
  color: ${({ theme, $error }) =>
    $error ? theme.colors.error : theme.colors.success};
  font-size: .88rem;
`;

const ExistingComment = styled.blockquote`
  margin: 14px 0 0;
  padding: 16px;
  border-left: 3px solid ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

const ratingLabel = (rating) => `${rating}점`;

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
    if (!exchangeId || status !== "completed") {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    getMyGoldExchangeReview(exchangeId)
      .then((review) => {
        if (active) setExisting(review);
      })
      .catch((error) => {
        console.error("교환 후기 확인 실패:", error);
        if (active) {
          setIsError(true);
          setMessage("후기 작성 여부를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
    const cleanComment = comment.trim();
    setMessage("");
    setIsError(false);

    if (cleanComment.length < 10) {
      setIsError(true);
      setMessage("후기를 10자 이상 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await submitGoldExchangeReview({
        exchangeId,
        rating,
        comment: cleanComment,
      });
      setExisting({
        rating,
        comment: cleanComment,
        reviewerLabel: "교환 완료 고객",
        verified: true,
        createdAt: new Date(),
      });
      setMessage("교환 후기가 등록되었습니다.");
    } catch (error) {
      setIsError(true);
      if (error?.code === "already-exists") {
        setMessage("이 교환 건에는 이미 후기가 등록되어 있습니다.");
      } else if (error?.code === "failed-precondition") {
        setMessage("교환 완료 처리된 건만 후기를 작성할 수 있습니다.");
      } else {
        setMessage("후기 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel aria-labelledby={`review-title-${exchangeId}`}>
      <Head>
        <div>
          <h3 id={`review-title-${exchangeId}`}>교환 후기</h3>
          <p>실제 교환 완료 고객만 한 번 작성할 수 있습니다.</p>
        </div>
        <Verified>교환 완료 확인</Verified>
      </Head>

      {loading ? (
        <p>후기 작성 여부를 확인하는 중입니다.</p>
      ) : existing ? (
        <>
          <div aria-label={`평점 ${existing.rating}점`}>
            {"★".repeat(Number(existing.rating) || 0)}
            {"☆".repeat(Math.max(0, 5 - (Number(existing.rating) || 0)))}
          </div>
          <ExistingComment>{existing.comment}</ExistingComment>
          {message && <Message>{message}</Message>}
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

          <label htmlFor={`exchange-review-${exchangeId}`}>
            <strong>후기 내용</strong>
          </label>
          <Textarea
            id={`exchange-review-${exchangeId}`}
            value={comment}
            onChange={(event) => setComment(event.target.value.slice(0, 500))}
            maxLength={500}
            placeholder="교환 과정에서 좋았던 점이나 도움이 된 점을 알려주세요."
            required
          />
          <FormMeta>
            <span>연락처·주소·접수번호는 적지 마세요.</span>
            <span>{comment.length}/500</span>
          </FormMeta>
          <Submit
            type="submit"
            disabled={submitting || comment.trim().length < 10}
          >
            {submitting ? "등록 중..." : "교환 후기 등록"}
          </Submit>
          {message && <Message $error={isError}>{message}</Message>}
        </form>
      )}
    </Panel>
  );
}
