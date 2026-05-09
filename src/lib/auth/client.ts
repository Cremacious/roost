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
