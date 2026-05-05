import { UtensilsCrossed } from 'lucide-react'

function StubPage({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 24 }}>
      <div style={{ color: 'var(--roost-text-muted)' }}>{icon}</div>
      <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--roost-text-primary)', margin: 0 }}>{label}</p>
      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--roost-text-muted)', margin: 0 }}>Coming in the next update</p>
    </div>
  )
}

export default function FoodPage() {
  return <StubPage icon={<UtensilsCrossed size={40} />} label="Food" />
}
