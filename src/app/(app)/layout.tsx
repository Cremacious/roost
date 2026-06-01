import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { DevTools } from '@/components/dev/DevTools'
import JoinRequestsBanner from '@/components/shared/JoinRequestsBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const membership = await getUserHousehold(session.user.id)
  const isPremium = membership?.household.subscriptionStatus === 'premium'

  return (
    <div className="flex" style={{ minHeight: '100dvh', backgroundColor: 'var(--roost-bg)' }}>
      <Sidebar />
      <TopBar />
      <JoinRequestsBanner />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: 56, paddingBottom: 52 }}
      >
        {children}
      </main>
      {/* BottomNav is self-fixed at bottom: 0 */}
      <BottomNav />
      <DevTools />
    </div>
  )
}
