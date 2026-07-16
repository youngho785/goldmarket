// src/components/chat/MessageInput.js
import React, { useState, useRef } from "react";
import styled from "styled-components";
import { uploadImage } from "../../services/storageService";

const InputArea = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fffbe8;
  border-top: 1px solid #f3e8ff;
`;

const TextInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  font-size: 1rem;
  border-radius: 20px;
  border: 1px solid #ffe082;
  margin-right: 10px;
`;

const Button = styled.button`
  padding: 8px 14px;
  border: none;
  background: #ffcd38;
  color: #3d2601;
  border-radius: 16px;
  font-weight: 700;
  margin-left: 8px;
  cursor: pointer;
  &:disabled {
    background: #e6e6e6;
    color: #bbb;
    cursor: not-allowed;
  }
`;

const FileInput = styled.input`
  display: none;
`;

const ImagePreview = styled.div`
  margin-right: 12px;
  position: relative;
  img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 8px;
    border: 1.5px solid #ffd400;
  }
  button {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ffd400;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 14px;
    cursor: pointer;
  }
`;

export default function MessageInput({ onSend }) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef();

  // 메시지/이미지 전송
  const handleSend = async () => {
    if ((!text || text.trim().length === 0) && !imageFile) return;
    setSending(true);
    let imageUrl = null;
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (err) {
        alert("이미지 업로드 실패! 다시 시도해주세요.");
        setSending(false);
        return;
      }
    }
    await onSend({ text: text.trim(), imageUrl });
    setText("");
    setImageFile(null);
    setSending(false);
  };

  // 파일 선택
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  // 이미지 미리보기 삭제
  const handleRemoveImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 엔터 전송
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && (text.trim() || imageFile)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <InputArea>
      <label>
        <span role="img" aria-label="사진" style={{ fontSize: 22, marginRight: 6 }}>📷</span>
        <FileInput
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>
      {imageFile && (
        <ImagePreview>
          <img src={URL.createObjectURL(imageFile)} alt="미리보기" />
          <button onClick={handleRemoveImage} type="button">×</button>
        </ImagePreview>
      )}
      <TextInput
        type="text"
        value={text}
        disabled={sending}
        onChange={e => setText(e.target.value)}
        placeholder="메시지 입력..."
        onKeyDown={handleKeyDown}
      />
      <Button
        onClick={handleSend}
        disabled={sending || (!text.trim() && !imageFile)}
      >
        보내기
      </Button>
    </InputArea>
  );
}
