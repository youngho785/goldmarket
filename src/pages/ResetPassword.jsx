// src/pages/ResetPassword.js
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'firebase/auth';
import { auth } from '../firebase/firebase';

export default function ResetPassword() {
  try { auth.languageCode = 'ko'; } catch {}

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [step, setStep] = useState(oobCode ? 'verifying' : 'email');
  const [email, setEmail] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [sending, setSending] = useState(false);
  const [reseting, setReseting] = useState(false);

  useEffect(() => {
    if (step === 'verifying' && oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then(fetchedEmail => {
          setEmail(fetchedEmail);
          setStep('reset');
        })
        .catch(() => {
          setError('유효하지 않거나 만료된 링크입니다.');
          setStep('email');
        });
    }
  }, [step, oobCode]);

  const sendLink = async e => {
    e.preventDefault();
    if (sending) return;
    setMsg(''); setError('');
    setSending(true);

    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) {
      setError('이메일을 입력해주세요.');
      setSending(false);
      return;
    }

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password?mode=resetPassword`,
        handleCodeInApp: true
      };
      await sendPasswordResetEmail(auth, normalized, actionCodeSettings);
      setMsg('재설정 링크를 발송했습니다. 메일함을 확인해주세요.');
    } catch (err) {
      const code = err?.code || '';
      setError(
        code === 'auth/user-not-found'
          ? '등록된 이메일이 아닙니다.'
          : code === 'auth/network-request-failed'
          ? '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
          : err.message
      );
    } finally {
      setSending(false);
    }
  };

  const reset = async e => {
    e.preventDefault();
    if (reseting) return;
    setMsg(''); setError('');

    if (!newPwd || !confirmPwd) {
      setError('새 비밀번호와 확인값을 모두 입력하세요.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    const complexity = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!complexity.test(newPwd)) {
      setError('비밀번호는 최소 8자 이상이어야 하며, 영문자·숫자·특수문자를 포함해야 합니다.');
      return;
    }

    setReseting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPwd);
      setStep('success');
      setMsg('비밀번호가 성공적으로 변경되었습니다!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      if (err.code === 'auth/weak-password') {
        setError('새 비밀번호가 너무 약합니다. 8자 이상이어야 합니다.');
      } else if (err.code === 'auth/expired-action-code') {
        setError('재설정 링크가 만료되었습니다. 이메일로 새 링크를 받아주세요.');
      } else {
        setError('비밀번호 변경에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
      }
    } finally {
      setReseting(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: 'auto' }}>
      {step === 'email' && (
        <>
          <h1>비밀번호 재설정</h1>
          <form onSubmit={sendLink} autoComplete="on">
            <div>
              <label htmlFor="resetEmail">이메일</label>
              <input
                id="resetEmail"
                name="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                disabled={sending}
              />
            </div>
            <button type="submit" style={{ marginTop: 14 }} disabled={sending}>
              {sending ? '전송 중...' : '재설정 링크 보내기'}
            </button>
          </form>
        </>
      )}

      {step === 'reset' && (
        <>
          <h1>새 비밀번호 설정</h1>
          <p>계정: {email}</p>
          <form onSubmit={reset} autoComplete="on">
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="newPwd">새 비밀번호</label>
              <input
                id="newPwd"
                name="new-password"
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
                minLength={8}
                autoFocus
                autoComplete="new-password"
                disabled={reseting}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="newPwdConfirm">새 비밀번호 확인</label>
              <input
                id="newPwdConfirm"
                name="confirm-password"
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                required
                autoComplete="new-password"
                disabled={reseting}
              />
            </div>
            <button type="submit" style={{ marginTop: 14 }} disabled={reseting}>
              {reseting ? '변경 중...' : '변경하기'}
            </button>
          </form>
        </>
      )}

      {step === 'success' && (
        <div>
          <h2 style={{ color: 'green' }}>{msg}</h2>
          <Link to="/login">로그인 페이지로 이동</Link>
        </div>
      )}

      {(msg && step !== 'success') && (
        <p style={{ color: 'blue', marginTop: 14 }}>{msg}</p>
      )}
      {error && (
        <p style={{ color: 'red', marginTop: 14 }}>{error}</p>
      )}
    </div>
  );
}
