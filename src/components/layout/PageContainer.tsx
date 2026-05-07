'use client'

export function PageContainer({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`w-full mx-auto px-4 sm:px-6 sm:max-w-4xl ${className}`}>
      {children}
    </div>
  )
}
