// src/pages/AccountVerification.js
import React, { useState } from 'react';
import styled from 'styled-components';
import { storage, db } from '../firebase/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuthContext } from '../context/AuthContext';

const PageContainer = styled.div`
  max-width: 450px; margin: 40px auto; padding: 24px; background: #fff;
  border-radius: 10px; box-shadow: 0 2px 10px #eee;
`;
const Field = styled.div` margin-bottom: 18px; `;
const Label = styled.label` font-weight: bold; `;
const Input = styled.input` display: block; width: 100%; margin-top: 5px; `;
const Button = styled.button`
  padding: 10px 0; width: 100%; background: #007bff; color: #fff;
  border: none; border-radius: 5px; font-size: 1.1rem;
  &:disabled { background: #aaa; }
`;

export default function AccountVerification() {
  const { user } = useAuthContext();
  const [idFile, setIdFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  // 업로드 핸들러
  const handleFileChange = (setter) => e => setter(e.target.files[0]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!user) return setError('로그인 필요');
    if (!idFile || !bankFile || !agree) return setError('모든 항목을 업로드하고 동의해야 합니다.');

    setLoading(true);
    try {
      // 1) Storage 업로드
      const idRef = ref(storage, `accountVerifications/${user.uid}_id.jpg`);
      const bankRef = ref(storage, `accountVerifications/${user.uid}_bank.jpg`);
      await uploadBytes(idRef, idFile);
      await uploadBytes(bankRef, bankFile);

      const idUrl = await getDownloadURL(idRef);
      const bankUrl = await getDownloadURL(bankRef);

      // 2) Firestore 문서 생성 (상태: 대기중)
      await setDoc(doc(db, 'accountVerifications', user.uid), {
        userId: user.uid,
        idImageUrl: idUrl,
        bankImageUrl: bankUrl,
        agreed: true,
        status: 'pending', // 대기중
        submittedAt: serverTimestamp(),
      });

      setResult('제출 완료! 관리자 확인 후 승인됩니다.');
      setIdFile(null); setBankFile(null); setAgree(false);
    } catch (err) {
      setError('오류: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <h2>신분증·계좌 인증 신청</h2>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      {result && <div style={{ color: 'green', marginBottom: 10 }}>{result}</div>}
      <form onSubmit={handleSubmit}>
        <Field>
          <Label>신분증 사진</Label>
          <Input type="file" accept="image/*" onChange={handleFileChange(setIdFile)} required />
        </Field>
        <Field>
          <Label>본인 명의 계좌(통장) 사진</Label>
          <Input type="file" accept="image/*" onChange={handleFileChange(setBankFile)} required />
        </Field>
        <Field>
          <Input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
          <span style={{ marginLeft: 6 }}>개인정보 수집 및 이용 동의</span>
        </Field>
        <Button type="submit" disabled={loading}>{loading ? '제출 중...' : '신청하기'}</Button>
      </form>
    </PageContainer>
  );
}
