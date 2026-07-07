'use client'

/**
 * Shared content-width wrapper for every page (issue #106).
 *
 * Replaces the old hard `sm:max-w-3xl` (768px) cap and the per-page ad hoc
 * 768/900/1024 widths with one tiered, centered scale defined in globals.css:
 *   - default : standard content pages  (.roost-page)
 *   - wide    : calendar / meals / money (.roost-page-wide)
 *
 * The column grows a notch at xl / 2xl / 3xl / 4xl so big monitors use more of
 * the screen while staying centered and readable. Horizontal padding scales up
 * a notch at the large breakpoints too.
 */
export function PageContainer({
  children,
  className = '',
  wide = false,
}: {
  children: React.ReactNode
  className?: string
  wide?: boolean
}) {
  const tier = wide ? 'roost-page-wide' : 'roost-page'
  return (
    <div className={`${tier} px-4 sm:px-6 xl:px-8 2xl:px-10 ${className}`}>
      {children}
    </div>
  )
}
