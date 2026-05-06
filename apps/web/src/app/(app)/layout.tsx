import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { AdBanner } from '@/components/layout/AdBanner'
import { DevTools } from '@/components/dev/DevTools'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const membership = await getUserHousehold(session.user.id)
  const isPremium = membership?.household.subscriptionStatus === 'premium'

  return (
    <div className="flex" style={{ minHeight: '100dvh', backgroundColor: 'var(--roost-bg)' }}>
      <Sidebar />
      <TopBar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: 56, paddingBottom: isPremium ? 52 : 102 }}
      >
        {children}
      </main>
      {/* BottomNav is self-fixed at bottom: 0 */}
      <BottomNav />
      <DevTools />
      {/* AdBanner sits above BottomNav (bottom: 52) */}
      {!isPremium && (
        <div
          className="md:hidden"
          style={{ position: 'fixed', bottom: 52, left: 0, right: 0, zIndex: 49, display: 'flex', justifyContent: 'center' }}
        >
          <AdBanner isPremium={isPremium} />
        </div>
      )}
    </div>
  )
}
