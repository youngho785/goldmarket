//src/components/common/Notifications.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import styled from "styled-components";
import { useNotificationContext } from "@/context/NotificationContext";

const Wrapper = styled.div`
  position: relative;
`;

const Toggle = styled.button`
  position: relative;
  min-height: 40px;
  padding: 6px 8px;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: inherit;
  cursor: pointer;
`;

const Badge = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 99px;
  background: ${({ theme }) => theme.colors.error};
  color: white;
  font-size: .68rem;
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 1200;
  width: min(340px, calc(100vw - 32px));
  max-height: 420px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.lg};

  @media (max-width: 680px) {
    position: fixed;
    top: 128px;
    left: 12px;
    right: 12px;
    width: auto;
    max-height: min(58dvh, 430px);
    border-radius: 14px;
  }
`;

const Header = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  background: ${({ theme }) => theme.colors.surface};
  font-weight: 800;
`;

const Item = styled.button`
  display: block;
  width: 100%;
  min-height: auto;
  padding: 12px 14px;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 0;
  background: ${({ $unread, theme }) =>
    $unread ? theme.semantic.alertInfoBg : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  box-shadow: none;
  text-align: left;
  cursor: pointer;

  &:hover {
    transform: none;
    box-shadow: none;
  }
`;

const Title = styled.p`
  margin: 0 0 3px;
  font-weight: 800;
  line-height: 1.45;
`;

const Body = styled.p`
  margin: 0 0 3px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.55;
`;

const Time = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: .78rem;
`;

const TextButton = styled.button`
  min-height: 36px;
  padding: 4px 6px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.semantic.linkColor};
  box-shadow: none;
`;

const FooterButton = styled(TextButton)`
  position: sticky;
  bottom: 0;
  display: block;
  width: 100%;
  padding: 11px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  background: ${({ theme }) => theme.colors.surface};
  text-align: center;
  font-weight: 800;
`;

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeInternalLink(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

export default function Notifications() {
  const {
    latestNotifications,
    unreadNotifications,
    loading,
    markOneRead,
    markAllRead,
  } = useNotificationContext();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  const visibleNotifications = useMemo(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 680) {
      return latestNotifications.slice(0, 5);
    }
    return latestNotifications;
  }, [latestNotifications]);

  useEffect(() => {
    const closeOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const openNotification = async (item) => {
    setOpen(false);

    if (!item.read) {
      await markOneRead(item.id).catch(() => {});
    }

    const link = safeInternalLink(item.link || item.data?.link);
    if (link) navigate(link);
  };

  const handleMarkAllRead = async () => {
    if (busy) return;

    setBusy(true);
    try {
      await markAllRead();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrapper ref={wrapperRef}>
      <Toggle
        type="button"
        aria-label="알림 열기"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        🔔
        {unreadNotifications > 0 && (
          <Badge>
            {unreadNotifications > 99 ? "99+" : unreadNotifications}
          </Badge>
        )}
      </Toggle>

      {open && (
        <Dropdown role="dialog" aria-label="최근 알림">
          <Header>
            <span>최근 알림</span>

            {unreadNotifications > 0 && (
              <TextButton
                type="button"
                disabled={busy}
                onClick={handleMarkAllRead}
              >
                {busy ? "처리 중…" : "전체 읽음"}
              </TextButton>
            )}
          </Header>

          {loading ? (
            <Item type="button" $unread={false} disabled>
              <Body>알림을 불러오고 있습니다.</Body>
            </Item>
          ) : visibleNotifications.length === 0 ? (
            <Item type="button" $unread={false} disabled>
              <Body>알림이 없습니다.</Body>
            </Item>
          ) : (
            visibleNotifications.map((item) => {
              const createdAt = toDate(item.createdAt);

              return (
                <Item
                  type="button"
                  key={item.id}
                  $unread={!item.read}
                  onClick={() => openNotification(item)}
                >
                  <Title>{item.title || "알림"}</Title>
                  {item.body && <Body>{item.body}</Body>}

                  {createdAt && (
                    <Time>
                      {formatDistanceToNow(createdAt, {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </Time>
                  )}
                </Item>
              );
            })
          )}

          <FooterButton
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            알림 전체 보기
          </FooterButton>
        </Dropdown>
      )}
    </Wrapper>
  );
}