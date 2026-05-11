import { COOKIE_NAME } from '@/lib/admin/auth'

export async function POST(): Promise<Response> {
  const response = Response.json({ success: true })
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  )
  return response
}
