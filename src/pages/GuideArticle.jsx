// src/pages/GuideArticle.jsx
import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, Calculator, ChevronRight, Info } from "lucide-react";

import GuideLinks from "@/components/guide/GuideLinks";
import { getGoldGuide } from "@/data/goldGuides";

const Page = styled.main`
  display: grid;
  gap: 16px;
  width: min(920px, 100%);
  margin: 0 auto;
  padding: 14px 0 46px;
`;

const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .67rem;

  a {
    color: ${({ theme }) => theme.colors.link};
    font-weight: 850;
    text-decoration: none;
  }
`;

const Hero = styled.header`
  display: grid;
  gap: 10px;
  padding: clamp(24px, 4.5vw, 42px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.surface};

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .63rem;
    font-weight: 950;
    letter-spacing: .12em;
  }

  h1 {
    max-width: 790px;
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.85rem, 4.8vw, 3.05rem);
    line-height: 1.14;
    letter-spacing: -.05em;
    word-break: keep-all;
  }

  > p {
    max-width: 760px;
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .88rem;
    line-height: 1.7;
    word-break: keep-all;
  }
`;

const DirectAnswer = styled.section`
  display: grid;
  gap: 9px;
  padding: clamp(18px, 3vw, 24px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 32%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};

  span {
    color: ${({ theme }) => theme.semantic.badgeGoldText};
    font-size: .61rem;
    font-weight: 950;
    letter-spacing: .1em;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1rem, 2.5vw, 1.28rem);
    line-height: 1.5;
    word-break: keep-all;
  }
`;

const FormulaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => Math.min($count, 3)}, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const Formula = styled.div`
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .82rem;
  font-weight: 850;
  line-height: 1.55;
`;

const TableWrap = styled.section`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};

  table {
    width: 100%;
    min-width: 520px;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 12px 14px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
    text-align: left;
    font-size: .82rem;
    line-height: 1.5;
  }

  th {
    background: ${({ theme }) => theme.semantic.subtleTint};
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 900;
  }

  td {
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  tr:last-child td {
    border-bottom: 0;
  }
`;

const Article = styled.article`
  display: grid;
  gap: 10px;
`;

const Section = styled.section`
  padding: clamp(19px, 3vw, 26px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.05rem, 2.5vw, 1.35rem);
    letter-spacing: -.025em;
    word-break: keep-all;
  }

  p {
    margin: 9px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .9rem;
    line-height: 1.75;
    word-break: keep-all;
  }

  ul {
    display: grid;
    gap: 6px;
    margin: 11px 0 0;
    padding-left: 18px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
    line-height: 1.65;
  }
`;

const Notice = styled.aside`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 15px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 15px;
  background: ${({ theme }) => theme.semantic.alertInfoBg};
  color: ${({ theme }) => theme.semantic.alertInfoText};
  font-size: .8rem;
  line-height: 1.65;

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
  }
`;

const Actions = styled.section`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => Math.min($count, 2)}, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const Action = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  padding: 11px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: .82rem;
  font-weight: 900;
  text-decoration: none;

  &:first-child {
    border-color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 40%, ${({ theme }) => theme.colors.border});
  }
`;

export default function GuideArticle() {
  const { slug } = useParams();
  const guide = getGoldGuide(slug);

  if (!guide) {
    return <Navigate to="/guide" replace />;
  }

  return (
    <Page>
      <Breadcrumb aria-label="금 정보 가이드 경로">
        <Link to="/guide">금 정보 가이드</Link>
        <ChevronRight size={12} aria-hidden />
        <span>{guide.shortTitle}</span>
      </Breadcrumb>

      <Hero>
        <small>{guide.category} · KOREA GOLD MARKET GUIDE</small>
        <h1>{guide.title}</h1>
        <p>{guide.summary}</p>
      </Hero>

      <DirectAnswer aria-label="질문에 대한 바로 답">
        <span>먼저 답부터</span>
        <strong>{guide.directAnswer}</strong>
      </DirectAnswer>

      {guide.formulas?.length > 0 && (
        <FormulaGrid $count={guide.formulas.length} aria-label="계산 공식">
          {guide.formulas.map((formula) => (
            <Formula key={formula}>{formula}</Formula>
          ))}
        </FormulaGrid>
      )}

      {guide.table && (
        <TableWrap aria-label={`${guide.shortTitle} 표`}>
          <table>
            <thead>
              <tr>
                {guide.table.headers.map((header) => (
                  <th key={header} scope="col">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.table.rows.map((row, rowIndex) => (
                <tr key={`${guide.slug}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <Article>
        {guide.sections.map((section) => (
          <Section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets?.length > 0 && (
              <ul>
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            )}
          </Section>
        ))}
      </Article>

      <Notice>
        <Info size={17} aria-hidden />
        <span>{guide.notice}</span>
      </Notice>

      <Actions $count={guide.actions.length} aria-label="관련 기능 바로가기">
        {guide.actions.map((action) => (
          <Action key={`${guide.slug}-${action.to}`} to={action.to}>
            <span><Calculator size={14} aria-hidden /> {action.label}</span>
            <ArrowRight size={15} aria-hidden />
          </Action>
        ))}
      </Actions>

      <GuideLinks slugs={guide.related} title="이어서 읽기" />
    </Page>
  );
}