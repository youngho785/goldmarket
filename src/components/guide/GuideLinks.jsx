// src/components/guide/GuideLinks.jsx
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, BookOpen } from "lucide-react";

import { GUIDE_BY_SLUG } from "@/data/goldGuides";

const Wrap = styled.section`
  display: grid;
  gap: 12px;
  padding: clamp(18px, 3vw, 26px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1rem, 2vw, 1.18rem);
    letter-spacing: -.025em;
  }

  > a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .68rem;
    font-weight: 900;
    text-decoration: none;
    white-space: nowrap;
  }

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => Math.min($count, 3)}, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(Link)`
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 14px 15px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 14px;
  background: ${({ theme }) => theme.semantic.subtleTint};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  transition: transform ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.secondary};
  }

  small {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .61rem;
    font-weight: 900;
    letter-spacing: .08em;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: .82rem;
    line-height: 1.4;
    word-break: keep-all;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .68rem;
    line-height: 1.55;
    word-break: keep-all;
  }
`;

export default function GuideLinks({
  slugs = [],
  title = "함께 보면 좋은 금 정보",
}) {
  const guides = slugs.map((slug) => GUIDE_BY_SLUG[slug]).filter(Boolean);
  if (guides.length === 0) return null;

  return (
    <Wrap aria-label={title}>
      <Head>
        <h2>{title}</h2>
        <Link to="/guide">
          전체 금 정보 가이드 <ArrowRight size={13} aria-hidden />
        </Link>
      </Head>

      <Grid $count={guides.length}>
        {guides.map((guide) => (
          <Card key={guide.slug} to={`/guide/${guide.slug}`}>
            <small><BookOpen size={12} aria-hidden /> {guide.category}</small>
            <strong>{guide.shortTitle}</strong>
            <p>{guide.summary}</p>
          </Card>
        ))}
      </Grid>
    </Wrap>
  );
}