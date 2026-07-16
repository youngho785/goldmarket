import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useNotificationContext } from '../../context/NotificationContext';
import { Bell } from 'lucide-react';

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.h2};
  font-family: ${({ theme }) => theme.fonts.heading};
  color: ${({ theme }) => theme.colors.text};
`;

const IconWrapper = styled.div`
  position: relative;
  cursor: pointer;
`;

const Badge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: ${({ theme }) => theme.colors.error};
  color: ${({ theme }) => theme.colors.buttonText};
  border-radius: 999px;
  padding: 2px 6px;
  font-size: ${({ theme }) => theme.typography.small};
  font-weight: bold;
`;

export default function Header() {
  const { unreadNotifications } = useNotificationContext();

  useEffect(() => {
    console.log('🔔 unreadNotifications:', unreadNotifications);
  }, [unreadNotifications]);

  return (
    <HeaderContainer>
      <Title>GoldMarket</Title>
      <IconWrapper>
        <Bell size={24} />
        {unreadNotifications > 0 && (
          <Badge>{unreadNotifications}</Badge>
        )}
      </IconWrapper>
    </HeaderContainer>
  );
}
