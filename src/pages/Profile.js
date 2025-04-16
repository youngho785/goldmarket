// src/pages/Profile.js
import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { fetchUserProfile, updateUserProfile } from "../services/userService";
import { storage } from "../firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import TransactionReviewsSummary from "./TransactionReviewsSummary"; // 거래 평가 내역 컴포넌트 추가

export default function Profile() {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    profileImage: "",
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);

  // 사용자 프로필 정보 불러오기
  useEffect(() => {
    if (user) {
      const getProfile = async () => {
        try {
          const userProfile = await fetchUserProfile(user.uid);
          if (userProfile) {
            setProfile(userProfile);
          } else {
            // 프로필 문서가 없으면 기본값 설정
            setProfile({
              name: "",
              email: user.email,
              phone: "",
              profileImage: "",
            });
          }
        } catch (err) {
          setError("프로필을 불러오는데 실패했습니다.");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      getProfile();
    }
  }, [user]);

  // 프로필 사진 파일 선택 및 업로드
  const handlePhotoChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const storageRef = ref(
          storage,
          `profilePhotos/${user.uid}_${Date.now()}_${file.name}`
        );
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        setProfile((prev) => ({ ...prev, profileImage: downloadURL }));
      } catch (err) {
        console.error("프로필 사진 업로드 실패:", err);
      }
    }
  };

  // 인풋 변경 핸들러
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // 프로필 수정 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (user) {
        await updateUserProfile(user.uid, profile);
        setEditing(false);
      }
    } catch (err) {
      setError("프로필 업데이트에 실패했습니다.");
      console.error(err);
    }
  };

  if (loading) return <p>로딩 중...</p>;
  if (!user) return <p>로그인이 필요합니다.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>내 프로필</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {editing ? (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "10px" }}>
            <label>프로필 사진: </label>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
            {profile.profileImage && (
              <img
                src={profile.profileImage}
                alt="프로필"
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "cover",
                  marginTop: "10px",
                }}
              />
            )}
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label>이름: </label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
            />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label>이메일: </label>
            <input type="text" name="email" value={profile.email} disabled />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label>전화번호: </label>
            <input
              type="text"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
            />
          </div>
          <button type="submit" style={{ marginRight: "10px" }}>
            저장
          </button>
          <button type="button" onClick={() => setEditing(false)}>
            취소
          </button>
        </form>
      ) : (
        <div>
          {profile.profileImage && (
            <img
              src={profile.profileImage}
              alt="프로필"
              style={{ width: "100px", height: "100px", objectFit: "cover" }}
            />
          )}
          <p>이름: {profile.name || "미등록"}</p>
          <p>이메일: {profile.email}</p>
          <p>전화번호: {profile.phone || "미등록"}</p>
          <button onClick={() => setEditing(true)}>프로필 수정</button>
          {/* 판매자라면 자신의 거래 평가 내역 요약을 표시 */}
          <TransactionReviewsSummary sellerId={user.uid} />
        </div>
      )}
    </div>
  );
}
