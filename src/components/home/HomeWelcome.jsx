import React from "react";
import styled from "styled-components";

const Welcome = styled.header`
  display:flex; align-items:end; justify-content:space-between; gap:20px; padding:8px 0 12px;
  p { margin:0 0 10px; font-size:10px; letter-spacing:.15em; color:var(--gm-text-secondary); font-weight:500; }
  h1 { margin:0; font-family:inherit; font-size:clamp(25px,3vw,36px); font-weight:500; letter-spacing:-.06em; line-height:1.4; }
  > span { font-size:11px; color:var(--gm-text-secondary); white-space:nowrap; }
  @media(max-width:600px) { padding:4px 0 6px; > span { display:none; } p { font-size:9px; } }
`;
export default function HomeWelcome({name, guest=false}) {
  const date = new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date());
  return <Welcome><div><p>YOUR GOLD. YOUR NEXT CHAPTER.</p><h1>{guest ? '금의 가치를 알아보세요.' : name ? `${name}님, 금의 가치를 이어가세요.` : '내 금의 새로운 하루.'}</h1></div><span>{date}</span></Welcome>;
}
