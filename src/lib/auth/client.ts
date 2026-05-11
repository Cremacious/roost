import { createAuthClient } from 'better-auth/react'

const baseURL = process.env.NEXT_PUBLIC_APP_URL
if (!baseURL) throw new Error('NEXT_PUBLIC_APP_URL is not set')

export const authClient = createAuthClient({ baseURL })

export const { signIn, signUp, signOut, useSession } = authClient

/** Request a password-reset email for the given address. */
export async function requestPasswordReset(email: string) {
  return authClient.requestPasswordReset({
    email,
    redirectTo: `${baseURL}/reset-password`,
  })
}

/** Set a new password using the token from the reset email link. */
export async function resetPassword(token: string, newPassword: string) {
  return authClient.resetPassword({ token, newPassword })
}

/** Resend the verification email to the given address. */
export async function sendVerificationEmail(email: string) {
  return authClient.sendVerificationEmail({
    email,
    callbackURL: '/onboarding',
  })
}

/**
 * Sign in with Google. Redirects to Google OAuth, then to callbackURL.
 * The middleware onboarding guard will intercept new users and route them to /onboarding.
 */
export async function signInWithGoogle(callbackURL = '/today') {
  return authClient.signIn.social({ provider: 'google', callbackURL })
}

/**
 * Sign in with Apple. Requires APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
 * in .env.local. The button renders immediately; the flow activates once those vars are set.
 */
export async function signInWithApple(callbackURL = '/today') {
  return authClient.signIn.social({ provider: 'apple', callbackURL })
}
