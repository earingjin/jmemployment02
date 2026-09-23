/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowRight, Check, CircleHelp, Menu, Play, Sparkles } from 'lucide-react';
import benefitVideo from './assets/국취신청.mp4';

const questions = ['현재 구직 중인가요?', '최근 1년 내 고용보험에 가입한 적이 있나요?', '청년·저소득층·경력단절 등 지원 대상에 해당하나요?'];

export default function App() {
  return <main>
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">J</span><span>잡온</span></a><nav><a href="#benefit">구직수당 안내</a><a href="#process">신청 방법</a><a href="#faq">자주 묻는 질문</a></nav><button className="login">로그인</button><button className="menu" aria-label="메뉴 열기"><Menu size={22} /></button></header>
    <section className="hero" id="top"><div className="hero-copy"><div className="eyebrow"><Sparkles size={16} /> 구직 중인 청년을 위한 지원 가이드</div><h1>취업 준비하는 동안,<br /><em>받을 수 있는 수당</em>부터<br />확인하세요.</h1><p className="intro">복잡한 지원 제도, 나에게 해당하는 것만 쉽고 빠르게 알려드려요.</p><div className="hero-actions"><a className="primary" href="#benefit">내 수당 가능성 확인 <ArrowRight size={19} /></a><a className="text-link" href="#process">신청 방법 보기 <span>→</span></a></div><div className="trust"><span><Check size={15} /></span> 1분이면 확인 가능해요 <i /> <strong>12,480명</strong>이 확인했어요</div></div>
      <div className="video-wrap" aria-label="구직수당 신청 안내 영상"><div className="video-label"><span className="pulse" /> 2분으로 보는 구직수당</div><video className="benefit-video" controls autoPlay muted loop playsInline preload="metadata"><source src={benefitVideo} type="video/mp4" />브라우저가 영상을 지원하지 않습니다.</video><div className="video-caption"><span><Play size={14} fill="currentColor" /> 구직수당, 이렇게 신청해요</span><small>국민취업지원제도 안내</small></div><div className="peach-orb" /></div></section>
    <section className="quick-check" id="benefit"><div className="section-heading"><span>BENEFIT CHECK</span><h2>나도 구직수당을 받을 수 있을까?</h2><p>몇 가지 질문만 답하면, 받을 수 있는 지원 제도를 찾아드려요.</p></div><div className="question-grid">{questions.map((question, index) => <div className="question" key={question}><b>0{index + 1}</b><p>{question}</p><CircleHelp size={18} /></div>)}<a href="#process" className="check-card">지금 확인하기 <ArrowRight size={20} /></a></div></section>
    <section className="process" id="process"><p className="section-kicker">HOW IT WORKS</p><h2>확인부터 신청까지<br />어렵지 않아요.</h2><div className="steps"><article><b>01</b><h3>지원 대상 확인</h3><p>내 상황에 맞는 수당을<br />간단하게 확인해요.</p></article><article><b>02</b><h3>필요 서류 준비</h3><p>놓치기 쉬운 서류까지<br />꼼꼼하게 안내해요.</p></article><article><b>03</b><h3>온라인 신청</h3><p>따라 하기 쉬운 영상으로<br />신청을 도와드려요.</p></article></div></section><footer id="faq">잡온 · 당신의 다음 시작을 응원합니다.</footer>
  </main>;
}
