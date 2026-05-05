import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/helpers'

export default async function HomePage() {
  const session = await getSession()
  redirect(session ? '/today' : '/login')
}
