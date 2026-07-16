// src/components/common/PhoneVerify.js
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { firebase } from '../../firebase/firebase'; // compat SDK
import 'firebase/compat/auth'; // auth compat

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export default function PhoneVerify({ onVerified }) {
  const authCompat = firebase.auth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  // recaptcha 초기화
  const initRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      const verifier = new firebase.auth.RecaptchaVerifier(
        'recaptcha-container',
        { size: 'invisible' },
        authCompat
      );
      verifier.render().catch(console.error);
      window.recaptchaVerifier = verifier;
    }
  };

  // OTP 전송
  const sendOTP = async () => {
    setError('');
    if (!/^\+?\d{10,14}$/.test(phone)) {
      setError('전화번호 형식이 올바르지 않습니다.');
      return;
    }
    initRecaptcha();
    try {
      const result = await authCompat.signInWithPhoneNumber(
        phone,
        window.recaptchaVerifier
      );
      setConfirmationResult(result);
      setTimer(60);
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      alert('인증 코드가 전송되었습니다.');
    } catch (err) {
      setError('OTP 전송 실패: ' + err.message);
    }
  };

  // OTP 확인
  const verifyOTP = async () => {
    setError('');
    if (!confirmationResult) {
      setError('먼저 인증 코드를 전송해 주세요.');
      return;
    }
    try {
      await confirmationResult.confirm(code);
      clearInterval(intervalRef.current);
      onVerified(phone);
      alert('휴대폰 번호 인증이 완료되었습니다.');
    } catch {
      setError('인증 코드가 올바르지 않습니다.');
    }
  };

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <Wrapper>
      <div id="recaptcha-container" />
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <label>전화번호</label>
      <input
        type="tel"
        value={phone}
        placeholder="+821012345678"
        onChange={e => setPhone(e.target.value)}
      />
      <button onClick={sendOTP} disabled={timer > 0}>
        {timer > 0 ? `재전송 ${timer}s` : '인증 코드 전송'}
      </button>

      <label>인증 코드</label>
      <input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value)}
      />
      <button onClick={verifyOTP}>인증 완료</button>
    </Wrapper>
  );
}
