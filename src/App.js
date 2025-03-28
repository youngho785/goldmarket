// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "./theme";
import GlobalStyle from "./styles/GlobalStyle";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Sell from "./pages/Sell";
import ChatList from "./pages/ChatList";
import ChatRoom from "./pages/ChatRoom";
import ProductDetail from "./pages/ProductDetail";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import TransactionReview from "./pages/TransactionReview";
import AdminDashboard from "./pages/AdminDashboard";
import TransactionReviewsSummaryWrapper from "./pages/TransactionReviewsSummaryWrapper";
import FCMNotifications from "./components/common/FCMNotifications";
import useFCM from "./hooks/useFCM";
import StatisticsDashboard from "./pages/StatisticsDashboard";
import { FavoritesProvider } from "./context/FavoritesContext";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  const { fcmToken, message } = useFCM();
  console.log("FCM Token:", fcmToken);
  console.log("Received FCM Message:", message);

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <FavoritesProvider>
          <GlobalStyle />
          <BrowserRouter>
            <Navbar />
            <FCMNotifications />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sell" element={<Sell />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              {/* 채팅 */}
              <Route path="/chat" element={<ChatList />} />
              <Route path="/chat/:chatId" element={<ChatRoom />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/profile" element={<Profile />} />
              <Route
                path="/transactionReview"
                element={<TransactionReview targetUserId="defaultUser" />}
              />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route
                path="/transactionReviews/:sellerId"
                element={<TransactionReviewsSummaryWrapper />}
              />
              <Route path="/statistics" element={<StatisticsDashboard />} />
            </Routes>
            <Footer />
          </BrowserRouter>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
