import Link from 'next/link'
import Image from 'next/image'
import { getSession } from '@/lib/auth/helpers'
import { redirect } from 'next/navigation'
import FaqAccordion from '@/components/home/FaqAccordion'
import HomepageAnimations from '@/components/home/HomepageAnimations'

export default async function HomePage() {
  const session = await getSession().catch(() => null)
  if (session) redirect('/today')

  return (
    <>
      <style>{`
        /* ── Reset ─────────────────────────────────────────────── */
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          font-family: var(--font-nunito), 'Nunito', system-ui, -apple-system, sans-serif;
          color: #1f2937;
          background: #fff;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        a { text-decoration: none; color: inherit; }
        img { display: block; max-width: 100%; }

        /* ── Tokens ────────────────────────────────────────────── */
        :root {
          --red: #EF4444;
          --red-dark: #C93B3B;
          --red-deeper: #B91C1C;
          --white: #ffffff;
          --off-white: #FEF2F2;
          --gray-50: #F9FAFB;
          --gray-100: #F3F4F6;
          --gray-200: #E5E7EB;
          --gray-400: #9CA3AF;
          --gray-500: #6B7280;
          --gray-600: #4B5563;
          --gray-700: #374151;
          --gray-900: #111827;
          --green: #22C55E;
          --green-light: #DCFCE7;
          --amber: #F59E0B;
          --amber-light: #FEF3C7;
          --orange: #F97316;
          --orange-light: #FFEDD5;
          --blue: #3B82F6;
          --blue-light: #DBEAFE;
          --cyan: #06B6D4;
          --cyan-light: #CFFAFE;
          --purple: #A855F7;
          --purple-light: #F3E8FF;
          --pink: #EC4899;
          --pink-light: #FCE7F3;
          --red-light: #FEE2E2;
        }

        /* ── Scroll animation system ───────────────────────────── */
        .reveal {
          opacity: 0;
          transform: translateY(40px) scale(0.97);
          transition: opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .reveal-left {
          opacity: 0;
          transform: translateX(-60px);
          transition: opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .reveal-left.visible {
          opacity: 1;
          transform: translateX(0);
        }
        .reveal-right {
          opacity: 0;
          transform: translateX(60px);
          transition: opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .reveal-right.visible {
          opacity: 1;
          transform: translateX(0);
        }
        .reveal-pop {
          opacity: 0;
          transform: scale(0.7);
          transition: opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                      transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .reveal-pop.visible {
          opacity: 1;
          transform: scale(1);
        }
        .stagger-1 { transition-delay: 0.05s; }
        .stagger-2 { transition-delay: 0.1s; }
        .stagger-3 { transition-delay: 0.15s; }
        .stagger-4 { transition-delay: 0.2s; }
        .stagger-5 { transition-delay: 0.25s; }
        .stagger-6 { transition-delay: 0.3s; }
        .stagger-7 { transition-delay: 0.35s; }
        .stagger-8 { transition-delay: 0.4s; }

        /* ── Hero ──────────────────────────────────────────────── */
        .hero {
          background: var(--red-deeper);
          min-height: 82vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 24px 20px;
          position: relative;
          overflow: hidden;
        }
        .hero::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0; right: 0;
          height: 80px;
          background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.06));
          pointer-events: none;
        }
        .hero-logo {
          width: 120px !important;
          height: 120px !important;
          margin-bottom: 20px;
          border-radius: 28px;
          filter: drop-shadow(0 4px 24px rgba(0,0,0,0.15));
        }
        .hero-brand {
          font-size: clamp(48px, 8vw, 80px);
          font-weight: 900;
          color: var(--white);
          letter-spacing: -2px;
          line-height: 1;
          margin-bottom: 12px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.1);
        }
        .hero h1 {
          font-size: clamp(20px, 3.5vw, 32px);
          font-weight: 800;
          color: rgba(255,255,255,0.85);
          letter-spacing: 0.01em;
          line-height: 1.05;
          margin-bottom: 16px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.1);
        }
        .hero-sub {
          font-size: clamp(16px, 2.5vw, 22px);
          font-weight: 700;
          color: rgba(255,255,255,0.85);
          max-width: 520px;
          margin: 0 auto 36px;
          line-height: 1.5;
        }
        .hero-btns {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn-white {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--white);
          color: var(--red);
          font-weight: 800;
          font-size: 16px;
          padding: 16px 32px;
          border-radius: 14px;
          border: none;
          border-bottom: 4px solid var(--gray-200);
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-white:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        .btn-white:active { transform: translateY(1px); }
        .btn-outline {
          display: inline-flex;
          align-items: center;
          background: transparent;
          color: var(--white);
          font-weight: 800;
          font-size: 16px;
          padding: 16px 32px;
          border-radius: 14px;
          border: 2.5px solid rgba(255,255,255,0.45);
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.7);
        }

        /* ── Section utility ───────────────────────────────────── */
        .section { padding: 64px 24px; }
        .section-inner { max-width: 1100px; margin: 0 auto; }
        .section-kicker {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gray-500);
          margin-bottom: 12px;
          text-align: center;
        }
        .section-heading {
          font-size: clamp(28px, 4vw, 44px);
          font-weight: 900;
          letter-spacing: -0.8px;
          color: var(--gray-900);
          text-align: center;
          line-height: 1.15;
          margin-bottom: 16px;
        }
        .section-desc {
          font-size: 17px;
          font-weight: 600;
          color: var(--gray-500);
          text-align: center;
          max-width: 560px;
          margin: 0 auto 40px;
          line-height: 1.6;
        }

        /* ── Feature showcase rows ─────────────────────────────── */
        .features { background: var(--white); }

        .feature-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
          margin-bottom: 80px;
        }
        .feature-row:last-child { margin-bottom: 0; }
        .feature-row.reverse .feature-text { order: 2; }
        .feature-row.reverse .feature-mockup { order: 1; }

        .feature-text { max-width: 460px; }
        .feature-label {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .feature-text h3 {
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 900;
          color: var(--gray-900);
          letter-spacing: -0.5px;
          margin-bottom: 12px;
          line-height: 1.15;
        }
        .feature-text p {
          font-size: 16px;
          font-weight: 600;
          color: var(--gray-500);
          line-height: 1.7;
        }
        .feature-text .feature-bonus {
          margin-top: 16px;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ── Mini UI mockups ───────────────────────────────────── */
        .mockup-frame {
          background: var(--white);
          border-radius: 20px;
          border: 1.5px solid var(--gray-200);
          border-bottom: 5px solid var(--gray-200);
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.06);
        }
        .mockup-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid var(--gray-100);
        }
        .mockup-bar-title {
          font-size: 14px;
          font-weight: 900;
          color: var(--gray-900);
        }
        .mockup-bar-pills { display: flex; gap: 6px; }
        .mockup-bar-pill {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 20px;
        }
        .mockup-body { padding: 16px 18px; }

        /* chore mockup */
        .chore-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--gray-100);
        }
        .chore-row:last-child { border-bottom: none; }
        .chore-check {
          width: 22px;
          height: 22px;
          border-radius: 7px;
          border: 2px solid var(--gray-200);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chore-check.done { background: var(--red); border-color: var(--red); }
        .chore-check.done svg { display: block; }
        .chore-info { flex: 1; }
        .chore-name { font-size: 13px; font-weight: 800; color: var(--gray-900); }
        .chore-name.struck { text-decoration: line-through; color: var(--gray-400); }
        .chore-who { font-size: 11px; font-weight: 700; color: var(--gray-400); }
        .chore-pts {
          font-size: 12px;
          font-weight: 900;
          color: var(--red);
          background: var(--red-light);
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }
        .chore-streak {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 14px;
          background: var(--off-white);
          border-radius: 10px;
        }
        .chore-streak-label { font-size: 12px; font-weight: 800; color: var(--red); }
        .chore-streak-bar {
          flex: 1;
          height: 6px;
          background: var(--red-light);
          border-radius: 3px;
          overflow: hidden;
        }
        .chore-streak-fill { height: 100%; width: 72%; background: var(--red); border-radius: 3px; }

        /* grocery mockup */
        .grocery-section-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--amber);
          margin: 12px 0 6px;
        }
        .grocery-section-label:first-child { margin-top: 0; }
        .grocery-item { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
        .grocery-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .grocery-name { font-size: 13px; font-weight: 700; color: var(--gray-700); flex: 1; }
        .grocery-qty { font-size: 11px; font-weight: 800; color: var(--gray-400); }
        .grocery-added {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 8px 12px;
          background: var(--amber-light);
          border-radius: 8px;
        }
        .grocery-added-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--amber);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
          color: var(--white);
        }
        .grocery-added-text { font-size: 11px; font-weight: 700; color: var(--amber); }

        /* expense mockup */
        .money-mock { display: flex; flex-direction: column; gap: 10px; }
        .money-balance-hero {
          background: var(--green);
          border-radius: 12px;
          padding: 14px 16px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
        }
        .money-stat { text-align: center; }
        .money-stat-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
        }
        .money-stat-value { font-size: 15px; font-weight: 900; color: var(--white); margin-top: 1px; }
        .money-stat-value.red-val { color: #FCA5A5; }
        .money-debt-card {
          background: var(--white);
          border: 1.5px solid var(--gray-200);
          border-radius: 10px;
          border-bottom: 3px solid var(--red);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .money-debt-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          color: var(--white);
          flex-shrink: 0;
        }
        .money-debt-info { flex: 1; }
        .money-debt-name { font-size: 12px; font-weight: 800; color: var(--gray-900); }
        .money-debt-sub { font-size: 10px; font-weight: 700; color: var(--gray-400); }
        .money-debt-amt { font-size: 14px; font-weight: 900; }
        .money-debt-arrow { width: 16px; height: 16px; color: var(--gray-400); }
        .money-chart-card { background: var(--gray-50); border-radius: 10px; padding: 12px 14px; }
        .money-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .money-chart-title { font-size: 11px; font-weight: 800; color: var(--gray-500); }
        .money-chart-pills { display: flex; gap: 4px; }
        .money-chart-pill {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          border: 1px solid var(--gray-200);
          background: var(--white);
          color: var(--gray-400);
        }
        .money-chart-pill.active { background: var(--green); color: var(--white); border-color: var(--green); }
        .money-category-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
        .money-cat-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .money-cat-name { font-size: 11px; font-weight: 700; color: var(--gray-700); flex: 1; }
        .money-cat-bar-wrap {
          width: 60px;
          height: 5px;
          border-radius: 3px;
          background: var(--gray-200);
          overflow: hidden;
          flex-shrink: 0;
        }
        .money-cat-bar { height: 100%; border-radius: 3px; }
        .money-cat-amt { font-size: 10px; font-weight: 800; color: var(--gray-500); width: 40px; text-align: right; flex-shrink: 0; }
        .money-receipt-mini {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--white);
          border: 1.5px solid var(--gray-200);
          border-radius: 10px;
          border-bottom: 3px solid var(--green);
        }
        .money-receipt-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: var(--green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .money-receipt-info { flex: 1; }
        .money-receipt-title { font-size: 12px; font-weight: 800; color: var(--gray-900); }
        .money-receipt-sub { font-size: 10px; font-weight: 600; color: var(--gray-400); }
        .money-receipt-amt { font-size: 13px; font-weight: 900; color: var(--gray-900); }

        /* calendar mockup */
        .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .cal-month { font-size: 14px; font-weight: 900; color: var(--gray-900); }
        .cal-nav { display: flex; gap: 4px; }
        .cal-nav-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--gray-100);
          border: none;
          font-size: 12px;
          font-weight: 900;
          color: var(--gray-500);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          text-align: center;
          margin-bottom: 12px;
        }
        .cal-day-label { font-size: 9px; font-weight: 800; color: var(--gray-400); padding: 4px 0; }
        .cal-day {
          font-size: 11px;
          font-weight: 700;
          color: var(--gray-700);
          padding: 5px 0;
          border-radius: 6px;
          position: relative;
        }
        .cal-day.today { background: var(--blue); color: var(--white); font-weight: 900; }
        .cal-day.has-event::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--blue);
        }
        .cal-day.today.has-event::after { background: var(--white); }
        .cal-day.empty { visibility: hidden; }
        .cal-event {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          margin-bottom: 4px;
        }
        .cal-event-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .cal-event-text { font-size: 11px; font-weight: 700; color: var(--gray-700); }
        .cal-event-time { font-size: 10px; font-weight: 700; color: var(--gray-400); margin-left: auto; }

        /* ── Bento extras grid ─────────────────────────────────── */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 80px;
        }
        .bento-card {
          border-radius: 20px;
          padding: 32px 28px;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .bento-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
        .bento-card h3 { font-size: 18px; font-weight: 900; margin-bottom: 8px; line-height: 1.2; }
        .bento-card p { font-size: 13px; font-weight: 600; line-height: 1.6; }
        .bento-card .bento-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        /* ── Comparison ────────────────────────────────────────── */
        .comparison { background: var(--gray-50); }
        .comp-table-wrap {
          background: var(--white);
          border-radius: 16px;
          border: 1.5px solid var(--gray-200);
          border-bottom: 5px solid var(--red);
          overflow: hidden;
        }
        .comp-table { width: 100%; border-collapse: collapse; min-width: 520px; }
        .comp-table th, .comp-table td {
          padding: 14px 18px;
          font-size: 13px;
          font-weight: 700;
          border-bottom: 1px solid var(--gray-100);
        }
        .comp-table thead th {
          font-size: 12px;
          font-weight: 800;
          color: var(--gray-500);
          border-bottom: 1.5px solid var(--gray-200);
          text-align: center;
        }
        .comp-table thead th:first-child { text-align: left; width: 40%; }
        .comp-table thead th.roost-col { color: var(--red); background: rgba(239,68,68,0.04); }
        .comp-table td { text-align: center; color: var(--gray-700); }
        .comp-table td:first-child { text-align: left; }
        .comp-table td.roost-col { background: rgba(239,68,68,0.03); }
        .comp-table tr:last-child td { border-bottom: none; }
        .comp-table .check { color: #22C55E; font-weight: 800; }
        .comp-table .cross { color: #F87171; font-weight: 600; }
        .comp-table .partial { color: var(--gray-400); font-weight: 600; }

        /* ── FAQ ───────────────────────────────────────────────── */
        .faq-section { background: var(--white); }
        .faq-list { max-width: 720px; margin: 0 auto; }
        .faq-item { border-bottom: 1.5px solid var(--gray-200); }
        .faq-item:last-child { border-bottom: none; }
        .faq-q {
          width: 100%;
          background: none;
          border: none;
          font-family: inherit;
          font-size: 17px;
          font-weight: 800;
          color: var(--gray-900);
          text-align: left;
          padding: 22px 40px 22px 0;
          cursor: pointer;
          position: relative;
          line-height: 1.4;
        }
        .faq-q::after {
          content: '+';
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          font-size: 24px;
          font-weight: 700;
          color: var(--red);
          transition: transform 0.3s;
        }
        .faq-item.open .faq-q::after {
          content: '\\2212';
          transform: translateY(-50%) rotate(0deg);
        }
        .faq-a {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), padding 0.3s;
          padding: 0;
        }
        .faq-item.open .faq-a { max-height: 300px; padding: 0 0 22px 0; }
        .faq-a p { font-size: 15px; font-weight: 600; color: var(--gray-500); line-height: 1.7; }

        /* ── Bottom CTA ────────────────────────────────────────── */
        .bottom-cta {
          background: var(--red-deeper);
          padding: 80px 24px;
          text-align: center;
          position: relative;
        }
        .bottom-cta h2 {
          font-size: clamp(28px, 5vw, 48px);
          font-weight: 900;
          color: var(--white);
          letter-spacing: -1px;
          margin-bottom: 12px;
          line-height: 1.1;
        }
        .bottom-cta .sub {
          font-size: 17px;
          font-weight: 700;
          color: rgba(255,255,255,0.8);
          margin-bottom: 36px;
        }

        /* ── Footer ────────────────────────────────────────────── */
        .footer { background: var(--red-deeper); padding: 32px 24px; }
        .footer-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .footer-brand { font-size: 18px; font-weight: 900; color: var(--white); }
        .footer-links { display: flex; gap: 20px; }
        .footer-links a { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.65); transition: color 0.2s; }
        .footer-links a:hover { color: var(--white); }
        .footer-copy {
          width: 100%;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          margin-top: 16px;
        }

        /* ── Mobile ────────────────────────────────────────────── */
        @media (max-width: 768px) {
          .section { padding: 48px 20px; }
          .feature-row {
            grid-template-columns: 1fr;
            gap: 32px;
            margin-bottom: 64px;
          }
          .feature-row.reverse .feature-text { order: 1; }
          .feature-row.reverse .feature-mockup { order: 2; }
          .feature-text { max-width: 100%; }
          .bento-grid { grid-template-columns: 1fr; }
          .hero-btns { flex-direction: column; align-items: center; }
          .btn-white, .btn-outline { width: min(100%, 280px); justify-content: center; }
          .comp-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .footer-inner { flex-direction: column; align-items: center; text-align: center; }
          .footer-links { justify-content: center; }
        }
      `}</style>

      {/* 1. HERO */}
      <section className="hero">
        <Image
          src="/brand/roost-icon.png"
          alt="Roost"
          width={120}
          height={120}
          className="hero-logo"
          priority
        />

        <p className="hero-brand">Roost</p>
        <h1>One App. No Excuses.</h1>
        <p className="hero-sub">Chores, groceries, meals, bills, calendar, reminders. Your entire household in one place.</p>

        <div className="hero-btns">
          <Link href="/signup" className="btn-white">Get Started Free</Link>
          <Link href="/login" className="btn-outline">Sign In</Link>
        </div>


      </section>

      {/* 2. FEATURES */}
      <section className="section features">
        <div className="section-inner">
          <h2 className="section-heading reveal">One app that actually does it all.</h2>
          <p className="section-desc reveal stagger-2">No half-baked features. No upgrade to unlock basic stuff. Roost handles the real, messy, beautiful chaos of sharing a home.</p>

          {/* ROW 1: Money */}
          <div className="feature-row">
            <div className="feature-text reveal-left">
              <span className="feature-label" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>Money</span>
              <h3>Bills, budgets, and<br/>who owes who.</h3>
              <p>Track every household expense, split costs any way you want, and snap receipts to auto-read line items. See spending trends, set budgets by category, and always know exactly where the money goes.</p>
              <div className="feature-bonus" style={{ color: 'var(--green)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>
                </svg>
                Receipt scanning + spending insights built in
              </div>
            </div>
            <div className="feature-mockup reveal-right">
              <div className="mockup-frame" style={{ borderBottomColor: 'var(--green)' }}>
                <div className="mockup-bar">
                  <span className="mockup-bar-title">Money</span>
                  <div className="mockup-bar-pills">
                    <span className="mockup-bar-pill" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>May</span>
                  </div>
                </div>
                <div className="mockup-body money-mock">
                  <div className="money-balance-hero">
                    <div className="money-stat">
                      <div className="money-stat-label">You&apos;re owed</div>
                      <div className="money-stat-value">$142.50</div>
                    </div>
                    <div className="money-stat">
                      <div className="money-stat-label">You owe</div>
                      <div className="money-stat-value red-val">$33.71</div>
                    </div>
                    <div className="money-stat">
                      <div className="money-stat-label">This month</div>
                      <div className="money-stat-value">$489.22</div>
                    </div>
                  </div>
                  <div className="money-debt-card">
                    <div className="money-debt-avatar" style={{ background: 'var(--red)' }}>A</div>
                    <div className="money-debt-info">
                      <div className="money-debt-name">You owe Alex</div>
                      <div className="money-debt-sub">From Target run</div>
                    </div>
                    <span className="money-debt-amt" style={{ color: 'var(--red)' }}>$33.71</span>
                    <svg className="money-debt-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                  <div className="money-chart-card">
                    <div className="money-chart-header">
                      <span className="money-chart-title">Spending trend</span>
                      <div className="money-chart-pills">
                        <span className="money-chart-pill">7d</span>
                        <span className="money-chart-pill active">30d</span>
                        <span className="money-chart-pill">90d</span>
                      </div>
                    </div>
                    <svg viewBox="0 0 200 50" style={{ width: '100%', height: '44px', display: 'block' }}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#22C55E" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d="M0,38 L20,35 L40,28 L60,32 L80,22 L100,25 L120,18 L140,20 L160,12 L180,15 L200,8 L200,50 L0,50 Z" fill="url(#spendGrad)"/>
                      <path d="M0,38 L20,35 L40,28 L60,32 L80,22 L100,25 L120,18 L140,20 L160,12 L180,15 L200,8" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="200" cy="8" r="3" fill="#22C55E"/>
                    </svg>
                  </div>
                  <div className="money-chart-card" style={{ paddingBottom: '10px' }}>
                    <div className="money-chart-title" style={{ marginBottom: '6px' }}>By category</div>
                    <div className="money-category-row">
                      <div className="money-cat-dot" style={{ background: 'var(--green)' }}></div>
                      <span className="money-cat-name">Groceries</span>
                      <div className="money-cat-bar-wrap"><div className="money-cat-bar" style={{ width: '72%', background: 'var(--green)' }}></div></div>
                      <span className="money-cat-amt">$198</span>
                    </div>
                    <div className="money-category-row">
                      <div className="money-cat-dot" style={{ background: 'var(--blue)' }}></div>
                      <span className="money-cat-name">Household</span>
                      <div className="money-cat-bar-wrap"><div className="money-cat-bar" style={{ width: '48%', background: 'var(--blue)' }}></div></div>
                      <span className="money-cat-amt">$132</span>
                    </div>
                    <div className="money-category-row">
                      <div className="money-cat-dot" style={{ background: 'var(--amber)' }}></div>
                      <span className="money-cat-name">Dining</span>
                      <div className="money-cat-bar-wrap"><div className="money-cat-bar" style={{ width: '35%', background: 'var(--amber)' }}></div></div>
                      <span className="money-cat-amt">$96</span>
                    </div>
                    <div className="money-category-row">
                      <div className="money-cat-dot" style={{ background: 'var(--purple)' }}></div>
                      <span className="money-cat-name">Transport</span>
                      <div className="money-cat-bar-wrap"><div className="money-cat-bar" style={{ width: '22%', background: 'var(--purple)' }}></div></div>
                      <span className="money-cat-amt">$63</span>
                    </div>
                  </div>
                  <div className="money-receipt-mini">
                    <div className="money-receipt-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
                      </svg>
                    </div>
                    <div className="money-receipt-info">
                      <div className="money-receipt-title">Target receipt scanned</div>
                      <div className="money-receipt-sub">10 items split 2 ways</div>
                    </div>
                    <span className="money-receipt-amt">$67.42</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Groceries + Meals */}
          <div className="feature-row reverse">
            <div className="feature-text reveal-right">
              <span className="feature-label" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>Groceries + Meals</span>
              <h3>Meal plan Monday,<br/>grocery list writes itself</h3>
              <p>Plan the week together, let everyone vote on meals, and push ingredients straight to a shared grocery list with one tap. Items auto-sort by store section so you are not zigzagging every aisle.</p>
              <div className="feature-bonus" style={{ color: 'var(--orange)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/>
                </svg>
                Recipes saved, reused, and loved by the household
              </div>
            </div>
            <div className="feature-mockup reveal-left">
              <div className="mockup-frame" style={{ borderBottomColor: 'var(--amber)' }}>
                <div className="mockup-bar">
                  <span className="mockup-bar-title">Grocery List</span>
                  <div className="mockup-bar-pills">
                    <span className="mockup-bar-pill" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>12 items</span>
                  </div>
                </div>
                <div className="mockup-body">
                  <div className="grocery-section-label">Produce</div>
                  <div className="grocery-item">
                    <div className="grocery-dot" style={{ background: 'var(--green)' }}></div>
                    <span className="grocery-name">Baby spinach</span>
                    <span className="grocery-qty">1 bag</span>
                  </div>
                  <div className="grocery-item">
                    <div className="grocery-dot" style={{ background: 'var(--green)' }}></div>
                    <span className="grocery-name">Avocados</span>
                    <span className="grocery-qty">3</span>
                  </div>
                  <div className="grocery-item">
                    <div className="grocery-dot" style={{ background: 'var(--orange)' }}></div>
                    <span className="grocery-name">Sweet potatoes</span>
                    <span className="grocery-qty">2 lbs</span>
                  </div>
                  <div className="grocery-section-label">Dairy</div>
                  <div className="grocery-item">
                    <div className="grocery-dot" style={{ background: 'var(--blue)' }}></div>
                    <span className="grocery-name">Greek yogurt</span>
                    <span className="grocery-qty">32 oz</span>
                  </div>
                  <div className="grocery-item">
                    <div className="grocery-dot" style={{ background: 'var(--blue)' }}></div>
                    <span className="grocery-name">Shredded mozzarella</span>
                    <span className="grocery-qty">1 bag</span>
                  </div>
                  <div className="grocery-section-label">Meat</div>
                  <div className="grocery-item">
                    <div className="grocery-dot" style={{ background: 'var(--red)' }}></div>
                    <span className="grocery-name">Chicken thighs</span>
                    <span className="grocery-qty">2 lbs</span>
                  </div>
                  <div className="grocery-added">
                    <div className="grocery-added-avatar">M</div>
                    <span className="grocery-added-text">Mom added 3 items from Taco Tuesday recipe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3: Chores */}
          <div className="feature-row">
            <div className="feature-text reveal-left">
              <span className="feature-label" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>Chores + Rewards</span>
              <h3>Chores that actually get done</h3>
              <p>Assign tasks, track who is pulling their weight, and let kids earn real rewards. Streaks, leaderboards, and a gentle nudge system that means you are not the one nagging. Again.</p>
              <div className="feature-bonus" style={{ color: 'var(--red)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Kids earn points toward rewards you set
              </div>
            </div>
            <div className="feature-mockup reveal-right">
              <div className="mockup-frame" style={{ borderBottomColor: 'var(--red)' }}>
                <div className="mockup-bar">
                  <span className="mockup-bar-title">Today&apos;s Chores</span>
                  <div className="mockup-bar-pills">
                    <span className="mockup-bar-pill" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>3 left</span>
                  </div>
                </div>
                <div className="mockup-body">
                  <div className="chore-row">
                    <div className="chore-check done">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5L19 7"/></svg>
                    </div>
                    <div className="chore-info">
                      <div className="chore-name struck">Take out trash</div>
                      <div className="chore-who">Completed by Jake</div>
                    </div>
                    <span className="chore-pts">+10 pts</span>
                  </div>
                  <div className="chore-row">
                    <div className="chore-check done">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5L19 7"/></svg>
                    </div>
                    <div className="chore-info">
                      <div className="chore-name struck">Load dishwasher</div>
                      <div className="chore-who">Completed by Emma</div>
                    </div>
                    <span className="chore-pts">+15 pts</span>
                  </div>
                  <div className="chore-row">
                    <div className="chore-check"></div>
                    <div className="chore-info">
                      <div className="chore-name">Vacuum living room</div>
                      <div className="chore-who">Assigned to Jake</div>
                    </div>
                    <span className="chore-pts">+20 pts</span>
                  </div>
                  <div className="chore-row">
                    <div className="chore-check"></div>
                    <div className="chore-info">
                      <div className="chore-name">Wipe down counters</div>
                      <div className="chore-who">Assigned to Emma</div>
                    </div>
                    <span className="chore-pts">+10 pts</span>
                  </div>
                  <div className="chore-row">
                    <div className="chore-check"></div>
                    <div className="chore-info">
                      <div className="chore-name">Feed the dog</div>
                      <div className="chore-who">Assigned to Jake</div>
                    </div>
                    <span className="chore-pts">+5 pts</span>
                  </div>
                  <div className="chore-streak">
                    <span className="chore-streak-label">Jake: 5-day streak</span>
                    <div className="chore-streak-bar"><div className="chore-streak-fill"></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 4: Calendar */}
          <div className="feature-row reverse">
            <div className="feature-text reveal-right">
              <span className="feature-label" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>Calendar + Reminders</span>
              <h3>One calendar.<br/>The whole house sees it.</h3>
              <p>School pickups, dentist visits, game nights, grocery runs. Set recurring events once and forget them. Push notifications hit the right person at the right time on mobile.</p>
              <div className="feature-bonus" style={{ color: 'var(--blue)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                </svg>
                Push notifications on iOS and Android
              </div>
            </div>
            <div className="feature-mockup reveal-left">
              <div className="mockup-frame" style={{ borderBottomColor: 'var(--blue)' }}>
                <div className="mockup-bar">
                  <span className="mockup-bar-title">House Calendar</span>
                </div>
                <div className="mockup-body">
                  <div className="cal-header">
                    <span className="cal-month">May 2026</span>
                    <div className="cal-nav">
                      <span className="cal-nav-btn">&#8249;</span>
                      <span className="cal-nav-btn">&#8250;</span>
                    </div>
                  </div>
                  <div className="cal-grid">
                    <span className="cal-day-label">S</span><span className="cal-day-label">M</span><span className="cal-day-label">T</span><span className="cal-day-label">W</span><span className="cal-day-label">T</span><span className="cal-day-label">F</span><span className="cal-day-label">S</span>
                    <span className="cal-day empty">·</span><span className="cal-day empty">·</span><span className="cal-day empty">·</span><span className="cal-day empty">·</span><span className="cal-day empty">·</span><span className="cal-day">1</span><span className="cal-day">2</span>
                    <span className="cal-day">3</span><span className="cal-day has-event">4</span><span className="cal-day">5</span><span className="cal-day has-event">6</span><span className="cal-day today has-event">7</span><span className="cal-day">8</span><span className="cal-day has-event">9</span>
                    <span className="cal-day">10</span><span className="cal-day">11</span><span className="cal-day has-event">12</span><span className="cal-day">13</span><span className="cal-day">14</span><span className="cal-day has-event">15</span><span className="cal-day">16</span>
                  </div>
                  <div className="cal-event" style={{ background: 'var(--blue-light)' }}>
                    <div className="cal-event-dot" style={{ background: 'var(--blue)' }}></div>
                    <span className="cal-event-text">Emma: Soccer practice</span>
                    <span className="cal-event-time">4:00 PM</span>
                  </div>
                  <div className="cal-event" style={{ background: 'var(--orange-light)' }}>
                    <div className="cal-event-dot" style={{ background: 'var(--orange)' }}></div>
                    <span className="cal-event-text">Taco Tuesday dinner</span>
                    <span className="cal-event-time">6:30 PM</span>
                  </div>
                  <div className="cal-event" style={{ background: 'var(--purple-light)' }}>
                    <div className="cal-event-dot" style={{ background: 'var(--purple)' }}></div>
                    <span className="cal-event-text">Jake: Piano lesson</span>
                    <span className="cal-event-time">Thu 5 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BENTO */}
          <div className="bento-grid">
            <div className="bento-card reveal-pop stagger-1" style={{ background: 'var(--purple-light)', color: 'var(--purple)' }}>
              <div className="bento-icon" style={{ background: 'rgba(168,85,247,0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                  <path d="M14 2v6h6"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h3 style={{ color: 'var(--gray-900)' }}>Shared notes</h3>
              <p style={{ color: 'var(--gray-600)' }}>Wi-Fi password, vet number, house rules, landlord&apos;s email. Everything the household needs in one searchable place.</p>
            </div>
            <div className="bento-card reveal-pop stagger-2" style={{ background: 'var(--cyan-light)', color: 'var(--cyan)' }}>
              <div className="bento-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 style={{ color: 'var(--gray-900)' }}>Admin controls</h3>
              <p style={{ color: 'var(--gray-600)' }}>Toggle every feature on or off per member. Don&apos;t want kids adding expenses? One switch. You are in full control.</p>
            </div>
            <div className="bento-card reveal-pop stagger-3" style={{ background: 'var(--pink-light)', color: 'var(--pink)' }}>
              <div className="bento-icon" style={{ background: 'rgba(236,72,153,0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <path d="M20 8v6M23 11h-6"/>
                </svg>
              </div>
              <h3 style={{ color: 'var(--gray-900)' }}>Child accounts</h3>
              <p style={{ color: 'var(--gray-600)' }}>Kids log in with a simple PIN. They see chores and rewards, and you control the rest.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COMPARISON TABLE */}
      <section className="section comparison">
        <div className="section-inner">
          <p className="section-kicker reveal">Why Roost?</p>
          <h2 className="section-heading reveal stagger-1">Everything they don&apos;t have.<br/>Nothing you don&apos;t need.</h2>
          <p className="section-desc reveal stagger-2">Other apps do one thing. Roost does them all, and they actually talk to each other.</p>
          <div className="comp-table-wrap reveal stagger-3" style={{ overflowX: 'auto' }}>
            <table className="comp-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="roost-col">Roost</th>
                  <th>Splitwise</th>
                  <th>Cozi</th>
                  <th>OurHome</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Chore tracking + rewards</td><td className="roost-col check">&#10003;</td><td className="cross">&#10005;</td><td className="cross">&#10005;</td><td className="check">&#10003;</td></tr>
                <tr><td>Grocery lists</td><td className="roost-col check">&#10003;</td><td className="cross">&#10005;</td><td className="check">&#10003;</td><td className="check">&#10003;</td></tr>
                <tr><td>Bill splitting</td><td className="roost-col check">&#10003;</td><td className="check">&#10003;</td><td className="cross">&#10005;</td><td className="cross">&#10005;</td></tr>
                <tr><td>Receipt scanning</td><td className="roost-col check">&#10003;</td><td className="cross">&#10005;</td><td className="cross">&#10005;</td><td className="cross">&#10005;</td></tr>
                <tr><td>Meal planning + voting</td><td className="roost-col check">&#10003;</td><td className="cross">&#10005;</td><td className="partial">~</td><td className="cross">&#10005;</td></tr>
                <tr><td>Shared calendar</td><td className="roost-col check">&#10003;</td><td className="cross">&#10005;</td><td className="check">&#10003;</td><td className="check">&#10003;</td></tr>
                <tr><td>Child accounts + PIN login</td><td className="roost-col check">&#10003;</td><td className="cross">&#10005;</td><td className="cross">&#10005;</td><td className="partial">~</td></tr>
                <tr><td>Push reminders</td><td className="roost-col check">&#10003;</td><td className="cross">&#10005;</td><td className="check">&#10003;</td><td className="cross">&#10005;</td></tr>
                <tr><td>Shared notes</td><td className="roost-col check">&#10003;</td><td className="cross">&#10005;</td><td className="cross">&#10005;</td><td className="cross">&#10005;</td></tr>
                <tr><td>Admin controls</td><td className="roost-col check">&#10003;</td><td className="cross">&#10005;</td><td className="cross">&#10005;</td><td className="partial">~</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. FAQ */}
      <section className="section faq-section">
        <div className="section-inner">
          <p className="section-kicker reveal">Questions? We got answers.</p>
          <h2 className="section-heading reveal stagger-1" style={{ marginBottom: '48px' }}>FAQ</h2>
          <FaqAccordion />
        </div>
      </section>

      {/* 5. BOTTOM CTA */}
      <section className="bottom-cta">
        <h2 className="reveal">Households run better with Roost.</h2>
   
        <Link href="/signup" className="btn-white reveal stagger-2">Create Your Account</Link>
      </section>

      {/* 6. FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-brand">Roost</span>
          <div className="footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
        <p className="footer-copy">&copy; 2026 Roost. Built for families and roommates who share a home.</p>
      </footer>

      <HomepageAnimations />
    </>
  )
}
