// src/App.js

import React from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import GlobalStyle from "./styles/GlobalStyle";
import { theme } from "./theme";

import Navbar from "./components/common/Navbar";
import FCMNotifications from "./components/common/FCMNotifications";
import ScrollRestoration from "./components/ScrollRestoration";
import Footer from "./components/common/Footer";

import LandingPage from "./pages/LandingPage";
import TradeHome from "./pages/TradeHome";
import Sell from "./pages/Sell";
import MyProducts from "./pages/MyProducts";
import ProductDetail from "./pages/ProductDetail";
import ChatList from "./pages/ChatList";
import ChatRoom from "./pages/ChatRoom";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";                // ← 추가
import TransactionReview from "./pages/TransactionReview";
import TransactionReviewsSummaryWrapper from "./pages/TransactionReviewsSummaryWrapper";
import AdminDashboard from "./pages/AdminDashboard";
import StatisticsDashboard from "./pages/StatisticsDashboard";
import GoldExchange from "./pages/GoldExchange";
import AdminGoldExchangeRequests from "./pages/AdminGoldExchangeRequests";

import BoardTabs from "./components/BoardTabs";
import CreateBoardPost from "./pages/CreateBoardPost";
import BoardDetail from "./pages/BoardDetail";
import EditBoardPost from "./pages/EditBoardPost";
import NotFound from "./pages/NotFound";

import AdminRoute from "./components/common/AdminRoute";
import ProtectedRoute from "./components/common/ProtectedRoute"; // ← 추가

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />

      <Navbar />
      <FCMNotifications />
      <ScrollRestoration />

      <Routes>
        {/* 공개 페이지 */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/trade" element={<TradeHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />      {/* ← 추가 */}

        {/* 인증 필요: 상품 등록, 내 상품, 즐겨찾기, 프로필, 채팅 */}
        <Route
          path="/sell"
          element={
            <ProtectedRoute>
              <Sell />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-products"
          element={
            <ProtectedRoute>
              <MyProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:chatId"
          element={
            <ProtectedRoute>
              <ChatRoom />
            </ProtectedRoute>
          }
        />

        {/* 상품 상세(읽기는 공개) */}
        <Route path="/product/:id" element={<ProductDetail />} />

        {/* 거래 후기 페이지도 보호 */}
        <Route
          path="/transactionReview"
          element={
            <ProtectedRoute>
              <TransactionReview targetUserId="defaultUser" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactionReviews/:sellerId"
          element={
            <ProtectedRoute>
              <TransactionReviewsSummaryWrapper />
            </ProtectedRoute>
          }
        />

        {/* 관리자 전용 */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/statistics" element={<StatisticsDashboard />} />
          <Route
            path="/admin-gold-exchange-requests"
            element={<AdminGoldExchangeRequests />}
          />
        </Route>

        {/* 금 교환(일부 공개) */}
        <Route
          path="/gold-exchange"
          element={
            <ProtectedRoute>
              <GoldExchange />
            </ProtectedRoute>
          }
        />

        {/* 게시판 */}
        <Route path="/board" element={<BoardTabs />} />
        <Route path="/board/new" element={<CreateBoardPost />} />
        <Route path="/board/:postId" element={<BoardDetail />} />
        <Route path="/board/:postId/edit" element={<EditBoardPost />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </ThemeProvider>
  );
}
