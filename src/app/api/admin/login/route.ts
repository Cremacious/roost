import { NextRequest } from 'next/server'
import { checkAdminCredentials, createAdminSession, COOKIE_NAME } from '@/lib/admin/auth'

export async function POST(request: NextRequest): Promise<Response> {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email = '', password = '' } = body
  if (!checkAdminCredentials(email, password)) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await createAdminSession()

  const response = Response.json({ success: true })
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${8 * 60 * 60}`
  )
  return response
}
