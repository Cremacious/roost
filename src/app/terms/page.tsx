import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
}

const EFFECTIVE_DATE = 'May 1, 2025'
const CONTACT_EMAIL = 'support@roost.app'

const sectionStyle: React.CSSProperties = {
  marginBottom: 32,
}

const h2Style: React.CSSProperties = {
  fontFamily: 'var(--font-nunito)',
  fontWeight: 800,
  fontSize: 18,
  color: '#111827',
  margin: '0 0 10px',
}

const pStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#374151',
  lineHeight: 1.7,
  margin: '0 0 10px',
}

const liStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#374151',
  lineHeight: 1.7,
  marginBottom: 6,
}

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px 80px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 720 }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link
            href="/"
            style={{ fontWeight: 900, fontSize: 22, color: '#EF4444', textDecoration: 'none', fontFamily: 'var(--font-nunito)' }}
          >
            Roost
          </Link>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-nunito)',
            fontWeight: 900,
            fontSize: 32,
            color: '#111827',
            margin: '0 0 8px',
          }}
        >
          Terms of Service
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 40px' }}>
          Effective date: {EFFECTIVE_DATE}
        </p>

        <div style={sectionStyle}>
          <p style={pStyle}>
            Welcome to Roost. By creating an account or using our services, you agree to these Terms of
            Service. Please read them carefully. If you do not agree, do not use Roost.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>1. The Service</h2>
          <p style={pStyle}>
            Roost is a household management platform that helps households coordinate chores, groceries,
            expenses, calendars, notes, reminders, and meal planning. We offer a free tier and a Premium
            subscription at $4 per month per household.
          </p>
          <p style={pStyle}>
            We reserve the right to modify, suspend, or discontinue any part of the service at any time
            with reasonable notice.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>2. Accounts</h2>
          <p style={pStyle}>
            You must be at least 13 years old to create a standard account. Child accounts (under 13) may
            be created by a parent or household admin on the child&apos;s behalf.
          </p>
          <p style={pStyle}>
            You are responsible for maintaining the security of your account credentials. Notify us
            immediately at {CONTACT_EMAIL} if you suspect unauthorized access.
          </p>
          <p style={pStyle}>
            One person may belong to multiple households but Premium is required for membership in more
            than one household. The household admin is responsible for the subscription.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>3. Acceptable Use</h2>
          <p style={pStyle}>You agree not to:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={liStyle}>Use Roost for any unlawful purpose</li>
            <li style={liStyle}>Attempt to gain unauthorized access to other accounts or systems</li>
            <li style={liStyle}>Reverse engineer, decompile, or disassemble any part of the service</li>
            <li style={liStyle}>Use automated tools to scrape or extract data</li>
            <li style={liStyle}>Upload malicious code or interfere with the service</li>
            <li style={liStyle}>Impersonate another person or household</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>4. Your Content</h2>
          <p style={pStyle}>
            You retain ownership of any content you create in Roost (notes, chores, expense descriptions,
            etc.). By using Roost, you grant us a limited license to store, display, and process your
            content solely to provide the service.
          </p>
          <p style={pStyle}>
            You are responsible for the content you create. Do not store sensitive personal information
            (Social Security numbers, passport numbers, etc.) in Roost.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Premium Subscription and Billing</h2>
          <p style={pStyle}>
            Roost Premium is billed at $4 per month per household. The household admin holds the
            subscription and all members of that household benefit.
          </p>
          <p style={pStyle}>
            Subscriptions renew automatically each month unless cancelled. You can cancel at any time
            from Settings. Access to Premium features continues until the end of the paid billing period.
          </p>
          <p style={pStyle}>
            We do not offer refunds for partial months unless required by law. Payments are processed
            securely by Stripe. We do not store your payment card information.
          </p>
          <p style={pStyle}>
            We reserve the right to change pricing with at least 30 days notice. Continued use after
            the price change takes effect constitutes acceptance of the new price.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>6. Free Tier Limits</h2>
          <p style={pStyle}>
            The free tier includes up to 5 household members, 5 chores, 10 tasks, 10 notes, 1 grocery
            list, and 5 active reminders per household. These limits may change. We will provide
            reasonable notice of any reductions to existing limits.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Termination</h2>
          <p style={pStyle}>
            You may delete your account at any time from Settings. We may suspend or terminate accounts
            that violate these Terms, with or without notice depending on severity.
          </p>
          <p style={pStyle}>
            If a household admin deletes their account without transferring admin to another member, the
            household may be dissolved and its data deleted.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Disclaimer of Warranties</h2>
          <p style={pStyle}>
            Roost is provided &quot;as is&quot; without warranties of any kind, express or implied, including
            but not limited to merchantability, fitness for a particular purpose, or non-infringement.
            We do not guarantee the service will be error-free, uninterrupted, or perfectly secure.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Limitation of Liability</h2>
          <p style={pStyle}>
            To the fullest extent permitted by law, Roost and its operators shall not be liable for any
            indirect, incidental, special, or consequential damages arising from your use of or inability
            to use the service. Our total liability to you for any claim shall not exceed the amount you
            paid us in the 12 months preceding the claim.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>10. Governing Law</h2>
          <p style={pStyle}>
            These Terms are governed by the laws of the State of Delaware, United States, without regard
            to conflict of law principles.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>11. Changes to These Terms</h2>
          <p style={pStyle}>
            We may update these Terms from time to time. We will update the effective date and, for
            material changes, notify you by email or in-app banner. Continued use after changes take
            effect constitutes acceptance.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>12. Contact</h2>
          <p style={pStyle}>
            Questions? Email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#EF4444', fontWeight: 700 }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 24, marginTop: 8, display: 'flex', gap: 24 }}>
          <Link href="/" style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', textDecoration: 'none' }}>
            Back to home
          </Link>
          <Link href="/privacy" style={{ fontSize: 14, fontWeight: 700, color: '#6B7280', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
