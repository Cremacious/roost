import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

const EFFECTIVE_DATE = 'May 1, 2025'
const CONTACT_EMAIL = 'privacy@roost.app'

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

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 40px' }}>
          Effective date: {EFFECTIVE_DATE}
        </p>

        <div style={sectionStyle}>
          <p style={pStyle}>
            Roost (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a household management app that helps families and
            roommates coordinate chores, groceries, expenses, and schedules. This Privacy Policy explains
            what information we collect, how we use it, and the choices you have.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>1. Information We Collect</h2>
          <p style={pStyle}><strong>Account information.</strong> When you sign up, we collect your name and email address. You may also set a profile color for your avatar.</p>
          <p style={pStyle}><strong>Household data.</strong> We store the content you create inside Roost: chore assignments, grocery items, expenses, calendar events, notes, reminders, and meal plans. This data is associated with your household.</p>
          <p style={pStyle}><strong>Usage data.</strong> We collect activity logs within your household (who completed a chore, who added a grocery item) to power the activity feed. We do not sell this data.</p>
          <p style={pStyle}><strong>Payment information.</strong> If you subscribe to Roost Premium, payment is processed by Stripe. We store only a Stripe customer ID and subscription status. We never see or store your full card number.</p>
          <p style={pStyle}><strong>Location and preferences.</strong> If you grant location access, we store your latitude and longitude to show local weather. You can remove this at any time in Settings. We also store your timezone, temperature unit preference, and language preference.</p>
          <p style={pStyle}><strong>Push tokens.</strong> If you use the Roost mobile app and enable notifications, we store your Expo push token to send you reminders and alerts.</p>
          <p style={pStyle}><strong>Receipt images.</strong> If you use receipt scanning (Premium), images are sent to Microsoft Azure Document Intelligence for OCR processing. Images are not stored by Roost after processing.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>2. How We Use Your Information</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={liStyle}>To provide and improve the Roost service</li>
            <li style={liStyle}>To authenticate you and maintain your session</li>
            <li style={liStyle}>To send transactional emails (password resets, invite links)</li>
            <li style={liStyle}>To send push notifications you have opted into</li>
            <li style={liStyle}>To process your subscription payments via Stripe</li>
            <li style={liStyle}>To show local weather in the app (if location is granted)</li>
            <li style={liStyle}>To operate scheduled jobs (chore reminders, expense crons)</li>
          </ul>
          <p style={{ ...pStyle, marginTop: 12 }}>
            We do not sell, rent, or share your personal information with third parties for marketing purposes.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>3. Data Sharing</h2>
          <p style={pStyle}>
            Your household data is shared only with other members of your household. We use the following
            third-party services to operate Roost:
          </p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={liStyle}><strong>Neon</strong> (database hosting)</li>
            <li style={liStyle}><strong>Vercel</strong> (application hosting and edge network)</li>
            <li style={liStyle}><strong>Stripe</strong> (payment processing)</li>
            <li style={liStyle}><strong>Resend</strong> (transactional email)</li>
            <li style={liStyle}><strong>Microsoft Azure</strong> (receipt OCR, Premium only)</li>
            <li style={liStyle}><strong>Expo</strong> (push notifications, mobile only)</li>
            <li style={liStyle}><strong>Open-Meteo</strong> (weather data, no personal data shared)</li>
          </ul>
          <p style={{ ...pStyle, marginTop: 12 }}>
            Each provider has its own privacy policy. We only share the minimum data necessary to provide each service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>4. Data Retention</h2>
          <p style={pStyle}>
            Your data is retained as long as your account exists. Deleted items (chores, notes, tasks, etc.)
            are soft-deleted and purged after 30 days. If you delete your account, your data is removed from
            our active systems. Household activity logs older than 90 days are periodically purged.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Children</h2>
          <p style={pStyle}>
            Roost supports child accounts created by a parent or guardian. Child accounts do not require an
            email address and are identified only by a display name and PIN set by the household admin. Child
            accounts do not have access to financial features, and we do not serve ads or collect analytics
            on child accounts in compliance with COPPA.
          </p>
          <p style={pStyle}>
            If you believe a child under 13 has provided us personal information without parental consent,
            please contact us at {CONTACT_EMAIL} and we will promptly delete it.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>6. Your Rights</h2>
          <p style={pStyle}>You may at any time:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={liStyle}>Update your profile information in Settings</li>
            <li style={liStyle}>Remove your location from Settings</li>
            <li style={liStyle}>Cancel your Premium subscription from Settings</li>
            <li style={liStyle}>Delete your account from Settings (Danger Zone)</li>
            <li style={liStyle}>Request a copy of your data by emailing us</li>
          </ul>
          <p style={{ ...pStyle, marginTop: 12 }}>
            If you are in the European Economic Area, you have additional rights under GDPR, including
            the right to access, rectify, erase, and port your data. Contact us to exercise these rights.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Security</h2>
          <p style={pStyle}>
            We use HTTPS for all data in transit, bcrypt-derived key stretching for passwords, and
            HttpOnly session cookies. We do not store plain-text passwords or PINs. That said, no system
            is completely secure, and we cannot guarantee absolute security.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Changes to This Policy</h2>
          <p style={pStyle}>
            We may update this policy from time to time. If we make material changes, we will update the
            effective date above. Continued use of Roost after changes constitutes acceptance.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Contact Us</h2>
          <p style={pStyle}>
            Questions about this policy? Email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#EF4444', fontWeight: 700 }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 24, marginTop: 8, display: 'flex', gap: 24 }}>
          <Link href="/" style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', textDecoration: 'none' }}>
            Back to Home
          </Link>
          <Link href="/terms" style={{ fontSize: 14, fontWeight: 700, color: '#6B7280', textDecoration: 'none' }}>
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}
