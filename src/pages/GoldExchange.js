// src/pages/GoldExchange.js
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useAuthContext } from "../context/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// Styled Components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: ${({ theme }) => theme.colors.background};
  min-height: 100vh;
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.colors.white};
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 30px;
  width: 100%;
  max-width: 800px;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  text-align: center;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 5px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
`;

const HelpText = styled.small`
  margin-top: 3px;
  color: #666;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  &:hover {
    background-color: ${({ theme }) => theme.colors.secondary};
  }
  &:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }
`;

const SmallButton = styled.button`
  padding: 6px 10px;
  margin-top: 5px;
  border: none;
  border-radius: 4px;
  background-color: #28a745;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: #218838;
  }
`;

const RemoveButton = styled(SmallButton)`
  background-color: #dc3545;
  &:hover {
    background-color: #c82333;
  }
`;

const ResultText = styled.p`
  font-size: 1.2rem;
  text-align: center;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  margin-top: 10px;
`;

const SectionSeparator = styled.div`
  height: 1px;
  background-color: #eee;
  margin: 30px 0;
`;

const PreviewImage = styled.img`
  margin-top: 10px;
  max-width: 100%;
  border-radius: 5px;
  border: 1px solid #ddd;
`;

/* 헬퍼 함수: 사용자가 입력한 수량을 g과 돈으로 함께 표시 (1돈 = 3.75 g) */
const displayOriginal = (quantity, unit) => {
  const qty = parseFloat(quantity);
  if (isNaN(qty)) return "0";
  if (unit === "g") {
    return qty.toFixed(2) + " g (" + (qty / 3.75).toFixed(2) + " 돈)";
  } else {
    return (qty * 3.75).toFixed(2) + " g (" + qty.toFixed(2) + " 돈)";
  }
};

/* 헬퍼 함수: 금속 종류를 포맷 (예: "14k(585)"를 "14케이"로 변환) */
const formatGoldType = (goldType) => {
  switch (goldType) {
    case "14k(585)":
      return "14케이";
    case "18k(750)":
      return "18케이";
    case "순금제품 995":
      return "순금995";
    case "순금제품 999":
      return "순금999";
    case "순금기타(문의)":
      return "순금기타";
    default:
      return goldType;
  }
};

/* 헬퍼 함수: 각 제품의 최종 순수 금 중량 계산 함수 */
const computeFinalWeight = (prod) => {
  const quantityNum = parseFloat(prod.quantity);
  if (isNaN(quantityNum) || quantityNum <= 0) return 0;
  const grams = prod.inputUnit === "g" ? quantityNum : quantityNum * 3.75;
  let conversionFactor;
  switch (prod.goldType) {
    case "14k(585)":
      conversionFactor = 0.54;
      break;
    case "18k(750)":
      conversionFactor = 0.72;
      break;
    case "순금제품 995":
      conversionFactor = 0.97;
      break;
    case "순금제품 999":
      conversionFactor = 0.98;
      break;
    default:
      conversionFactor = 0;
  }
  let exchangeFactor;
  if (prod.exchangeType === "999.9골드바") exchangeFactor = 0.95;
  else if (prod.exchangeType === "999.9 순금덩어리") exchangeFactor = 0.98;
  else exchangeFactor = 1;
  return grams * conversionFactor * exchangeFactor;
};

/* 헬퍼 함수: 계산된 중량을 원하는 단위로 표시 (unit: "g" 또는 "don") */
const displayResult = (grams, unit) => {
  return unit === "g"
    ? grams.toFixed(2) + " g"
    : (grams / 3.75).toFixed(2) + " 돈";
};

export default function GoldExchange() {
  const { user } = useAuthContext();

  // Step 1: 제품별 입력 상태 (여러 제품)
  const [products, setProducts] = useState([
    {
      goldType: "",
      quantity: "",
      inputUnit: "g",
      exchangeType: "",
      finalWeight: 0,
      stampFile: null,
      stampPreview: ""
    },
  ]);

  // Step 2: 추가 사용자 정보 상태
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  // 전화번호는 본인 인증과 추가 정보에 모두 사용
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // 본인 인증 관련 상태
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  const [calculated, setCalculated] = useState(false);
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 제품별 입력값 변경 처리
  const handleProductChange = (index, field, value) => {
    const newProducts = products.map((prod, idx) =>
      idx === index ? { ...prod, [field]: value } : prod
    );
    setProducts(newProducts);
  };

  // 각 제품별 각인 사진 파일 처리
  const handleProductStampFileChange = (index, e) => {
    const file = e.target.files[0];
    const newProducts = [...products];
    newProducts[index].stampFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newProducts[index].stampPreview = reader.result;
        setProducts([...newProducts]);
      };
      reader.readAsDataURL(file);
    } else {
      newProducts[index].stampPreview = "";
      setProducts([...newProducts]);
    }
  };

  // 제품 추가
  const addProduct = () => {
    setProducts([
      ...products,
      {
        goldType: "",
        quantity: "",
        inputUnit: "g",
        exchangeType: "",
        finalWeight: 0,
        stampFile: null,
        stampPreview: ""
      },
    ]);
  };

  // 제품 제거
  const removeProduct = (index) => {
    if (products.length === 1) return;
    setProducts(products.filter((_, idx) => idx !== index));
  };

  // 전체 제품 정보 계산 처리
  const handleCalculate = async (e) => {
    e.preventDefault();
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }
    for (let prod of products) {
      if (!prod.goldType || !prod.quantity || !prod.exchangeType) {
        setError("모든 제품 항목의 제품 종류, 수량, 교환 유형을 입력해 주세요.");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      const computedProducts = products.map((prod) => ({
        ...prod,
        finalWeight: computeFinalWeight(prod),
      }));
      setProducts(computedProducts);
      setCalculated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 본인 인증 관련 함수
  const initializeRecaptcha = () => {
    const auth = getAuth();
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {},
        },
        auth
      );
    }
  };

  const sendOTP = async () => {
    try {
      initializeRecaptcha();
      const auth = getAuth();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
      alert("인증 코드가 전송되었습니다. 휴대폰을 확인하세요.");
    } catch (error) {
      console.error("OTP 전송 오류", error);
      setError("OTP 전송에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const verifyOTP = async () => {
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(verificationCode);
        setIsVerified(true);
        alert("본인 인증이 완료되었습니다.");
      } else {
        setError("인증 코드를 보내지 않았습니다.");
      }
    } catch (error) {
      console.error("OTP 인증 오류", error);
      setError("OTP 인증에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 최종 교환 요청 제출 (추가 정보 + 제품별 각인 사진 업로드, 본인 인증 필요)
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!name || !address || !phone || !email) {
      setError("모든 사용자 정보를 입력해 주세요.");
      return;
    }
    if (!calculated) {
      setError("먼저 제품 정보를 모두 입력하고 계산해 주세요.");
      return;
    }
    if (!isVerified) {
      setError("본인 인증을 완료해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const storage = getStorage();
      const updatedProducts = await Promise.all(
        products.map(async (prod) => {
          let stampImageUrl = "";
          if (prod.stampFile) {
            const storageRef = ref(
              storage,
              `goldStamps/${user.uid}_${Date.now()}_${prod.stampFile.name}`
            );
            await uploadBytes(storageRef, prod.stampFile);
            stampImageUrl = await getDownloadURL(storageRef);
          }
          return { ...prod, stampImageUrl };
        })
      );
      const totalFinalWeight = updatedProducts.reduce(
        (sum, prod) => sum + prod.finalWeight,
        0
      );
      await addDoc(collection(db, "goldExchanges"), {
        userId: user.uid,
        products: updatedProducts,
        totalFinalWeight,
        totalFinalWeightInDon: (totalFinalWeight / 3.75).toFixed(2),
        name,
        address,
        phone,
        email,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setFinalSubmitted(true);
    } catch (err) {
      setError("최종 요청 제출에 실패했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Card>
        <Title>금 교환 요청</Title>
        {error && <ResultText style={{ color: "red" }}>{error}</ResultText>}
        {!calculated ? (
          <>
            <form onSubmit={handleCalculate}>
              {products.map((prod, index) => (
                <div
                  key={index}
                  style={{
                    border: "1px dashed #ddd",
                    padding: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <FormGroup>
                    <Label>제품의 종류</Label>
                    <Select
                      value={prod.goldType}
                      onChange={(e) =>
                        handleProductChange(index, "goldType", e.target.value)
                      }
                      required
                    >
                      <option value="">선택하세요</option>
                      <option value="14k(585)">14k(585)</option>
                      <option value="18k(750)">18k(750)</option>
                      <option value="순금제품 995">순금제품 995</option>
                      <option value="순금제품 999">순금제품 999</option>
                      <option value="순금기타(문의)">순금기타(문의)</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>수량</Label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <Input
                        type="number"
                        value={prod.quantity}
                        onChange={(e) =>
                          handleProductChange(index, "quantity", e.target.value)
                        }
                        required
                      />
                      <Select
                        value={prod.inputUnit}
                        onChange={(e) =>
                          handleProductChange(index, "inputUnit", e.target.value)
                        }
                        required
                      >
                        <option value="g">그램(g)</option>
                        <option value="don">돈</option>
                      </Select>
                    </div>
                  </FormGroup>
                  <FormGroup>
                    <Label>교환 유형</Label>
                    <Select
                      value={prod.exchangeType}
                      onChange={(e) =>
                        handleProductChange(index, "exchangeType", e.target.value)
                      }
                      required
                    >
                      <option value="">선택하세요</option>
                      <option value="999.9골드바">999.9골드바</option>
                      <option value="999.9 순금덩어리">999.9 순금덩어리</option>
                    </Select>
                  </FormGroup>
                  {products.length > 1 && (
                    <RemoveButton onClick={() => removeProduct(index)}>
                      제품 제거
                    </RemoveButton>
                  )}
                </div>
              ))}
              <SmallButton type="button" onClick={addProduct}>
                + 제품추가
              </SmallButton>
              <SectionSeparator />
              <Button type="submit" disabled={loading}>
                {loading ? "계산 중..." : "교환 결과 보기"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <SectionSeparator />
            {products.map((prod, index) => (
              <ResultText key={index}>
                제품 {index + 1} ({formatGoldType(prod.goldType)} :{" "}
                {displayOriginal(prod.quantity, prod.inputUnit)})
                : 순금 환산 결과: {displayResult(prod.finalWeight, "g")} (
                {displayResult(prod.finalWeight, "don")})
              </ResultText>
            ))}
            <ResultText>
              총 합계:{" "}
              {products
                .reduce((sum, prod) => sum + prod.finalWeight, 0)
                .toFixed(2)}{" "}
              g /{" "}
              {(products.reduce((sum, prod) => sum + prod.finalWeight, 0) / 3.75).toFixed(
                2
              )}{" "}
              돈
            </ResultText>
          </>
        )}
      </Card>

      {calculated && !finalSubmitted && (
        <Card>
          <Title>추가 정보 입력 및 본인 인증</Title>
          {/* 본인 인증 및 추가 정보 입력 */}
          <FormGroup>
            <Label>전화번호</Label>
            <Input
              type="tel"
              placeholder="+82 10-xxxx-xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <div id="recaptcha-container"></div>
            <SmallButton onClick={sendOTP}>인증 코드 전송</SmallButton>
          </FormGroup>
          <FormGroup>
            <Label>인증 코드 입력</Label>
            <Input
              type="text"
              placeholder="인증 코드를 입력하세요"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
            />
            <SmallButton onClick={verifyOTP}>인증 코드 확인</SmallButton>
          </FormGroup>
          <form onSubmit={handleFinalSubmit}>
            <FormGroup>
              <Label>성명</Label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </FormGroup>
            <FormGroup>
              <Label>주소</Label>
              <Input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </FormGroup>
            <FormGroup>
              <Label>이메일</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </FormGroup>
            {products.map((prod, index) => (
              <FormGroup key={index}>
                <Label>
                  제품 {index + 1} 각인 사진 업로드 (선택 사항)
                  <HelpText>
                    (반지, 목걸이, 팔찌 등 제품에 표기된 품위를 나타냅니다. 예:
                    14k 또는 585, 18k 또는 750, 24k, 995, 999)
                  </HelpText>
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleProductStampFileChange(index, e)}
                />
                {prod.stampPreview && (
                  <PreviewImage
                    src={prod.stampPreview}
                    alt={`제품 ${index + 1} 각인 미리보기`}
                  />
                )}
              </FormGroup>
            ))}
            <Button type="submit" disabled={loading || !isVerified}>
              {loading ? "제출 중..." : "최종 교환 요청 제출"}
            </Button>
          </form>
        </Card>
      )}

      {finalSubmitted && (
        <Card>
          <Title>요청 접수 완료</Title>
          <ResultText>
            관리자가 요청 정보를 확인 후 처리할 예정입니다.
          </ResultText>
        </Card>
      )}
    </PageContainer>
  );
}

// 헬퍼 함수: 금속 종류를 포맷 (중복 선언되지 않도록 한 번만 선언)
