// src/pages/TransactionReviewsSummaryWrapper.js
import React from "react";
import { useParams } from "react-router-dom";
import TransactionReviewsSummary from "./TransactionReviewsSummary";

export default function TransactionReviewsSummaryWrapper() {
  const { sellerId } = useParams();
  console.log("Wrapper에서 받은 sellerId:", sellerId);
  return <TransactionReviewsSummary sellerId={sellerId} />;
}
