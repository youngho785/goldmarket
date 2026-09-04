// src/pages/admin/AdminNotifications.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  listAdminNotificationSends,
  previewAdminNotificationRecipients,
  sendAdminNotification,
} from "@/services/adminNotificationClient";

const Wrap = styled.section`
  display: grid;
  gap: 18px;
`;

const Card = styled.section`
  padding: clamp(18px, 3vw, 26px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const Title = styled.h2`
  margin: 0 0 6px;
  color: ${({ theme }) => theme.colors.text};
`;

const Intro = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
`;

const TemplateBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`;

const TemplateButton = styled.button`
  min-height: 36px;
  padding: 7px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 750;
  cursor: pointer;

  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 7px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 750;
`;

const Input = styled.input`
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

const Select = styled.select`
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

const Textarea = styled.textarea`
  min-height: 110px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  resize: vertical;
`;

const Full = styled.div`
  grid-column: 1 / -1;
`;

const Preview = styled.div`
  display: grid;
  gap: 6px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  strong { color: ${({ theme }) => theme.colors.text}; }
  span { color: ${({ theme }) => theme.colors.textSecondary}; line-height: 1.55; }
  small { color: ${({ theme }) => theme.colors.textLight}; }
`;

const RecipientPreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};

  strong { color: ${({ theme }) => theme.colors.text}; }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`;

const Button = styled.button`
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 8px;
  background: ${({ $secondary, theme }) => $secondary ? theme.colors.surface : theme.colors.primary};
  color: ${({ $secondary, theme }) => $secondary ? theme.colors.text : (theme.on?.primary || "#fff")};
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
`;

const Status = styled.div`
  margin-top: 12px;
  color: ${({ $error, theme }) =>
    $error ? theme.colors.error : theme.colors.textSecondary};
  line-height: 1.55;
`;

const MarketingNotice = styled.div`
  margin-top: 14px;
  padding: 11px 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .82rem;
  line-height: 1.55;

  strong { color: ${({ theme }) => theme.colors.text}; }
`;

const History = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 14px;
`;

const HistoryRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const HistoryMeta = styled.div`
  display: grid;
  gap: 4px;

  strong { color: ${({ theme }) => theme.colors.text}; }
  span, small { color: ${({ theme }) => theme.colors.textSecondary}; }
`;

const Count = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .86rem;
  white-space: nowrap;
  text-align: right;
`;

const TARGET_LABELS = {
  all: "해당 알림 발송 가능 회원",
  goldNews: "광고성 정보 수신동의 회원",
  myGoldEmpty: "나의 금 미등록 회원",
  myGoldActive: "나의 금 등록 회원",
  bonusGoldHolders: "적립 순금 보유 회원",
  reservationCustomers: "금교환 예약 고객",
  specific: "특정 사용자",
};

const CATEGORY_LABELS = {
  goldNews: "금시세·주요 소식",
  myGold: "나의 금고 안내",
  benefits: "이벤트·퀴즈·혜택",
  exchange: "예약·교환 진행",
  general: "일반 중요 알림",
};

const HISTORY_STATUS_LABELS = {
  creating: "생성 중",
  completed: "완료",
  failed: "실패",
};

const MY_GOLD_TEMPLATES = [
  {
    label: "금고 시작 유도",
    targetType: "myGoldEmpty",
    category: "myGold",
    title: "나의 금고를 채워보세요",
    body: "가지고 있는 금을 등록하고 오늘의 참고가치를 확인해 보세요.",
    link: "/my-gold",
  },
  {
    label: "오늘 가치 확인",
    targetType: "myGoldActive",
    category: "myGold",
    title: "오늘 내 금의 가치는 얼마일까요?",
    body: "나의 금고에서 오늘의 참고가치와 변화를 확인해 보세요.",
    link: "/my-gold",
  },
  {
    label: "적립 순금 확인",
    targetType: "bonusGoldHolders",
    category: "myGold",
    title: "내 금고에 적립된 순금을 확인해 보세요",
    body: "한국골드마켓에서 적립한 순금과 나의 금을 한곳에서 확인해 보세요.",
    link: "/my-gold",
  },
];

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isMarketingCategory(category) {
  return ["goldNews", "myGold", "benefits"].includes(category);
}

function isMarketingTarget(targetType) {
  return ["goldNews", "myGoldEmpty", "myGoldActive", "bonusGoldHolders"].includes(targetType);
}

export default function AdminNotifications() {
  const [form, setForm] = useState({
    targetType: "all",
    category: "goldNews",
    specificUser: "",
    title: "",
    body: "",
    link: "/gold-price",
  });
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [recipientCount, setRecipientCount] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const canPreview = useMemo(() => {
    if (form.targetType === "specific" && !form.specificUser.trim()) return false;
    return true;
  }, [form.specificUser, form.targetType]);

  const canSend = useMemo(() => {
    if (!form.title.trim() || !form.body.trim()) return false;
    if (!form.link.trim().startsWith("/") || form.link.trim().startsWith("//")) return false;
    if (form.targetType === "specific" && !form.specificUser.trim()) return false;
    return Number(recipientCount) > 0;
  }, [form, recipientCount]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const result = await listAdminNotificationSends({ limit: 20 });
      setHistory(Array.isArray(result?.items) ? result.items : []);
    } catch (err) {
      console.warn("[AdminNotifications] history load failed:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const invalidateRecipients = () => {
    setRecipientCount(null);
    setMessage("");
    setError("");
  };

  const update = (key) => (event) => {
    const value = event.target.value;

    if (["targetType", "category", "specificUser"].includes(key)) {
      invalidateRecipients();
    }

    setForm((prev) => {
      if (key === "category") {
        let nextLink = prev.link;
        if (value === "goldNews" && (!nextLink.trim() || nextLink === "/" || nextLink === "/my-gold")) {
          nextLink = "/gold-price";
        } else if (value === "myGold" && (!nextLink.trim() || nextLink === "/" || nextLink === "/gold-price")) {
          nextLink = "/my-gold";
        } else if (!["goldNews", "myGold"].includes(value) && ["/gold-price", "/my-gold"].includes(nextLink)) {
          nextLink = "/";
        }

        return { ...prev, category: value, link: nextLink };
      }

      return { ...prev, [key]: value };
    });
  };

  const applyTemplate = (template) => {
    setForm((prev) => ({
      ...prev,
      targetType: template.targetType,
      category: template.category,
      title: template.title,
      body: template.body,
      link: template.link,
      specificUser: "",
    }));
    invalidateRecipients();
  };

  const handlePreviewRecipients = async () => {
    if (!canPreview || previewing || sending) return;
    setPreviewing(true);
    setMessage("");
    setError("");

    try {
      const result = await previewAdminNotificationRecipients({
        targetType: form.targetType,
        category: form.category,
        specificUser:
          form.targetType === "specific" ? form.specificUser.trim() : "",
      });
      setRecipientCount(Number(result?.recipientCount || 0));
    } catch (err) {
      setRecipientCount(null);
      setError(err?.message || "발송 대상 인원을 확인하지 못했습니다.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!canSend || sending) return;

    const marketing = isMarketingCategory(form.category) || isMarketingTarget(form.targetType);
    const targetText =
      form.targetType === "specific"
        ? `${TARGET_LABELS.specific} · ${form.specificUser.trim()}`
        : TARGET_LABELS[form.targetType];

    const confirmed = window.confirm(
      `${targetText} ${Number(recipientCount || 0).toLocaleString("ko-KR")}명에게 알림을 생성하시겠습니까?\n\n${form.title.trim()}\n${form.body.trim()}${
        marketing
          ? "\n\n※ 광고성 정보 수신동의 및 알림 설정을 서버에서 다시 확인합니다."
          : ""
      }`
    );
    if (!confirmed) return;

    setSending(true);
    setMessage("");
    setError("");

    try {
      const result = await sendAdminNotification({
        targetType: form.targetType,
        category: form.category,
        specificUser:
          form.targetType === "specific" ? form.specificUser.trim() : "",
        title: form.title.trim(),
        body: form.body.trim(),
        link: form.link.trim() || "/",
      });

      setMessage(
        `알림 생성 완료 · 알림 대상 ${Number(result?.recipientCount || 0).toLocaleString("ko-KR")}명`
      );
      setRecipientCount(null);
      setForm((prev) => ({ ...prev, title: "", body: "" }));
      await loadHistory();
    } catch (err) {
      setError(err?.message || "알림 발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const showMarketingNotice =
    isMarketingCategory(form.category) || isMarketingTarget(form.targetType);

  return (
    <Wrap>
      <Card>
        <Title>알림·캠페인</Title>
        <Intro>
          관리자 알림을 회원의 알림함에 생성하고, 수신 가능한 기기에는 푸시로 전달합니다.
          나의 금고 방문 유도 캠페인은 광고성 정보 수신동의가 있는 회원만 대상으로 합니다.
        </Intro>

        <TemplateBar aria-label="나의 금고 알림 빠른 문구">
          {MY_GOLD_TEMPLATES.map((template) => (
            <TemplateButton key={template.label} type="button" onClick={() => applyTemplate(template)}>
              {template.label}
            </TemplateButton>
          ))}
        </TemplateBar>

        <Grid>
          <Field>
            발송 대상
            <Select value={form.targetType} onChange={update("targetType")}>
              <option value="all">해당 알림 발송 가능 회원</option>
              <option value="goldNews">광고성 정보 수신동의 회원</option>
              <option value="myGoldEmpty">나의 금 미등록 회원</option>
              <option value="myGoldActive">나의 금 등록 회원</option>
              <option value="bonusGoldHolders">적립 순금 보유 회원</option>
              <option value="reservationCustomers">금교환 예약 고객</option>
              <option value="specific">특정 사용자</option>
            </Select>
          </Field>

          <Field>
            알림 종류
            <Select value={form.category} onChange={update("category")}>
              <option value="goldNews">금시세·주요 소식</option>
              <option value="myGold">나의 금고 안내</option>
              <option value="benefits">이벤트·퀴즈·혜택</option>
              <option value="exchange">예약·교환 진행</option>
              <option value="general">일반 중요 알림</option>
            </Select>
          </Field>

          {form.targetType === "specific" && (
            <Full>
              <Field>
                사용자 UID 또는 이메일
                <Input
                  value={form.specificUser}
                  onChange={update("specificUser")}
                  placeholder="Firebase UID 또는 가입 이메일"
                  autoComplete="off"
                />
              </Field>
            </Full>
          )}

          <Full>
            <Field>
              제목
              <Input
                value={form.title}
                onChange={update("title")}
                maxLength={80}
                placeholder="예: 오늘 내 금의 가치는 얼마일까요?"
              />
            </Field>
          </Full>

          <Full>
            <Field>
              내용
              <Textarea
                value={form.body}
                onChange={update("body")}
                maxLength={300}
                placeholder="알림 내용을 입력하세요."
              />
            </Field>
          </Full>

          <Full>
            <Field>
              클릭 시 이동할 내부 주소
              <Input
                value={form.link}
                onChange={update("link")}
                maxLength={200}
                placeholder="/my-gold, /gold-price 또는 /gold-exchange"
              />
            </Field>
          </Full>
        </Grid>

        {showMarketingNotice && (
          <MarketingNotice>
            <strong>광고성 알림 발송 기준</strong><br />
            나의 금고 방문 유도, 금시세·주요 소식, 이벤트·혜택 알림은 서버에서 광고성 정보 수신동의와
            알림 설정을 다시 확인합니다. 동의하지 않은 회원은 대상 필터에 포함되어도 실제 발송 대상에서 제외됩니다.
          </MarketingNotice>
        )}

        <Preview aria-label="알림 미리보기">
          <small>{CATEGORY_LABELS[form.category]} · 미리보기</small>
          <strong>{form.title.trim() || "알림 제목"}</strong>
          <span>{form.body.trim() || "알림 내용이 여기에 표시됩니다."}</span>
          <small>{form.link.trim() || "/"}</small>
        </Preview>

        <RecipientPreview>
          <span>발송 전 실제 대상 조건을 서버에서 다시 계산합니다.</span>
          <strong>
            {recipientCount == null
              ? "대상 미확인"
              : `예상 알림 대상 ${Number(recipientCount).toLocaleString("ko-KR")}명`}
          </strong>
        </RecipientPreview>

        <Actions>
          <Button $secondary type="button" disabled={!canPreview || previewing || sending} onClick={handlePreviewRecipients}>
            {previewing ? "대상 확인 중…" : "대상 인원 확인"}
          </Button>
          <Button type="button" disabled={!canSend || sending || previewing} onClick={handleSend}>
            {sending ? "알림 생성 중…" : "확인한 대상에게 발송"}
          </Button>
        </Actions>

        {message && <Status>{message}</Status>}
        {error && <Status $error>{error}</Status>}
      </Card>

      <Card>
        <Title>최근 발송 이력</Title>
        <Intro>관리자가 생성한 최근 알림 캠페인 기록입니다.</Intro>

        <History>
          {historyLoading ? (
            <Status>발송 이력을 불러오고 있습니다.</Status>
          ) : history.length === 0 ? (
            <Status>아직 관리자 발송 이력이 없습니다.</Status>
          ) : (
            history.map((item) => (
              <HistoryRow key={item.id}>
                <HistoryMeta>
                  <strong>{item.title || "알림"}</strong>
                  <span>{item.body || ""}</span>
                  <small>
                    {TARGET_LABELS[item.targetType] || item.targetType}
                    {" · "}
                    {CATEGORY_LABELS[item.category] || item.category}
                    {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ""}
                  </small>
                </HistoryMeta>
                <Count>
                  대상 {Number(item.recipientCount || 0).toLocaleString("ko-KR")}명<br />
                  {HISTORY_STATUS_LABELS[item.status] || item.status || "상태 확인 중"}
                </Count>
              </HistoryRow>
            ))
          )}
        </History>
      </Card>
    </Wrap>
  );
}
