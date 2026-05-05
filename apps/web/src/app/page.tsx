export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '8px',
        fontFamily: 'var(--font-nunito), sans-serif',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          fontWeight: 900,
          color: '#EF4444',
        }}
      >
        Roost
      </div>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#6b7280',
        }}
      >
        V2 — Phase 0 scaffold
      </div>
    </main>
  )
}
