'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signUp,
  signInWithGoogle,
  // signInWithApple: re-enable when Apple auth ships (see disabled button below)
} from '@/lib/auth/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  ShoppingCart,
  DollarSign,
  CalendarDays,
  UtensilsCrossed,
  Bell,
  Eye,
  EyeOff,
} from 'lucide-react';
import RoostLogo from '@/components/shared/RoostLogo';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="white"
      aria-hidden="true"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.18 1.37-2.16 3.89.03 3.02 2.65 4.03 2.68 4.04l-.07.19zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: CheckSquare,
    title: 'Chores',
    desc: 'Track who does what and keep score',
  },
  {
    icon: ShoppingCart,
    title: 'Grocery',
    desc: 'One shared list, no duplicate buys',
  },
  {
    icon: DollarSign,
    title: 'Expenses',
    desc: 'Split bills and settle up fairly',
  },
  {
    icon: CalendarDays,
    title: 'Calendar',
    desc: 'Household events everyone can see',
  },
  {
    icon: UtensilsCrossed,
    title: 'Meals',
    desc: 'Plan the week so nobody asks "what\'s for dinner"',
  },
  {
    icon: Bell,
    title: 'Reminders',
    desc: 'Nag the right people at the right time',
  },
];

function getStrength(password: string): number {
  if (password.length === 0) return 0;
  if (password.length < 8) return 1;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const complexity = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (complexity >= 2) return 4;
  if (complexity === 1) return 3;
  return 2;
}

function StrengthBar({ password }: { password: string }) {
  const score = getStrength(password);
  const colors = ['transparent', '#EF4444', '#F97316', '#EAB308', '#22C55E'];
  const labels = ['', 'Too short', 'Weak', 'Fair', 'Strong'];
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= score ? colors[score] : '#E5E7EB',
              transition: 'background-color 0.2s',
            }}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors[score],
            margin: '3px 0 0',
          }}
        >
          {labels[score]}
        </p>
      )}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  // Guests arriving from an invite link carry a callbackUrl so they return to
  // the invite after signing up instead of being routed into onboarding.
  const callbackUrl = params.get('callbackUrl');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(
    null,
  );

  async function handleGoogle() {
    setOauthLoading('google');
    // Proxy onboarding guard routes new users to /onboarding; existing users land on /today.
    await signInWithGoogle(callbackUrl ?? '/today');
  }

  // Apple sign-in is not wired up yet. Re-enable when Apple auth ships.
  // async function handleApple() {
  //   setOauthLoading('apple');
  //   await signInWithApple(callbackUrl ?? '/today');
  // }

  const confirmMismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (getStrength(password) < 3) {
      setError(
        'Password is too weak. Use 8+ characters with uppercase letters and numbers.',
      );
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await signUp.email({
        name,
        email,
        password,
        callbackURL: callbackUrl ?? '/onboarding',
      });
      if (result.error) {
        setError(result.error.message ?? 'Sign up failed');
        setLoading(false);
        return;
      }
      // Email verification is off — better-auth creates a session on signup.
      // Guests from an invite link return to the invite; everyone else onboards.
      router.push(callbackUrl ?? '/onboarding');
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      {/* Red left panel — desktop only */}
      <div
        className="hidden md:flex"
        style={{
          width: '40%',
          backgroundColor: '#B91C1C',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px clamp(24px, 4vw, 52px)',
          gap: 'clamp(24px, 3vw, 40px)',
        }}
      >
        {/* Brand block */}
        <div style={{ textAlign: 'center' }}>
          <RoostLogo size="lg" wordmarkColor="#fff" />
          <p
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontWeight: 700,
              fontSize: 'clamp(14px, 1.2vw, 17px)',
              margin: '12px 0 0',
            }}
          >
            One App, No Excuses.
          </p>
        </div>

        {/* Feature list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(14px, 1.6vw, 22px)',
            width: '100%',
            maxWidth: 320,
          }}
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'clamp(10px, 1vw, 14px)',
              }}
            >
              <div
                style={{
                  width: 'clamp(30px, 2.6vw, 38px)',
                  height: 'clamp(30px, 2.6vw, 38px)',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Icon size={15} color="#fff" />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 'clamp(13px, 1.2vw, 16px)',
                    fontWeight: 800,
                    color: '#fff',
                    margin: 0,
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize: 'clamp(12px, 1.05vw, 14px)',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.68)',
                    margin: '3px 0 0',
                    lineHeight: 1.4,
                  }}
                >
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#FFF5F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        {/* Mobile logo */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div
            className="flex md:hidden"
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              marginBottom: 28,
            }}
          >
            <RoostLogo size="xl" wordmark={false} />
            <p
              style={{
                fontWeight: 900,
                fontSize: 28,
                color: '#1A0505',
                margin: 0,
              }}
            >
              Roost
            </p>
          </div>

          <h1
            style={{
              color: '#1A0505',
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: '-0.5px',
              marginBottom: 4,
            }}
          >
            Create your account
          </h1>
          <p
            style={{
              color: '#7A3F3F',
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            Set up Roost for your household
          </p>

          {/* OAuth buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              onClick={handleGoogle}
              disabled={!!oauthLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#fff',
                border: '1.5px solid #E5E7EB',
                borderBottom: '3px solid #D1D5DB',
                borderRadius: 12,
                cursor: oauthLoading ? 'not-allowed' : 'pointer',
                opacity: oauthLoading && oauthLoading !== 'google' ? 0.5 : 1,
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: 14,
                color: '#1A0505',
              }}
            >
              {oauthLoading === 'google' ? (
                <span
                  style={{
                    width: 20,
                    height: 20,
                    border: '2px solid #E5E7EB',
                    borderTop: '2px solid #4285F4',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            {/* Apple sign-in is not wired up yet. Disabled with a Coming soon badge until Apple auth ships. */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-disabled="true"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '11px 16px',
                  backgroundColor: '#111827',
                  border: '1.5px solid #111827',
                  borderBottom: '3px solid #000',
                  borderRadius: 12,
                  cursor: 'not-allowed',
                  opacity: 0.55,
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                <AppleIcon />
                Continue with Apple
              </button>
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: 12,
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 999,
                  pointerEvents: 'none',
                }}
              >
                Coming soon
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ flex: 1, height: 1, backgroundColor: '#F5C5C5' }} />
            <span style={{ color: '#7A3F3F', fontWeight: 700, fontSize: 12 }}>
              or sign up with email
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#F5C5C5' }} />
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  color: '#7A3F3F',
                  marginBottom: 6,
                }}
              >
                NAME
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
                style={{
                  border: '1.5px solid #F5C5C5',
                  borderBottom: '3px solid #DBADB0',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  color: '#7A3F3F',
                  marginBottom: 6,
                }}
              >
                EMAIL
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                style={{
                  border: '1.5px solid #F5C5C5',
                  borderBottom: '3px solid #DBADB0',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  color: '#7A3F3F',
                  marginBottom: 6,
                }}
              >
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, number"
                  required
                  autoComplete="new-password"
                  style={{
                    border: '1.5px solid #F5C5C5',
                    borderBottom: '3px solid #DBADB0',
                    paddingRight: 44,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9B6060',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <StrengthBar password={password} />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  color: '#7A3F3F',
                  marginBottom: 6,
                }}
              >
                CONFIRM PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                  style={{
                    border: confirmMismatch
                      ? '1.5px solid #FCA5A5'
                      : '1.5px solid #F5C5C5',
                    borderBottom: confirmMismatch
                      ? '3px solid #EF4444'
                      : '3px solid #DBADB0',
                    paddingRight: 44,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9B6060',
                  }}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmMismatch && (
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#EF4444',
                    margin: '3px 0 0',
                  }}
                >
                  Passwords do not match
                </p>
              )}
            </div>

            {error && (
              <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>
                {error}
              </p>
            )}

            <Button
              type="submit"
              data-testid="signup-submit"
              loading={loading}
              color="#B91C1C"
              darkColor="#991B1B"
              size="lg"
            >
              Create account
            </Button>
          </form>

          <p
            style={{
              marginTop: 20,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#7A3F3F',
            }}
          >
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#EF4444' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
