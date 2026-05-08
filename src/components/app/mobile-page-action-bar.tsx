type MobilePageActionBarProps = {
  children: React.ReactNode
}

export function MobilePageActionBar({ children }: MobilePageActionBarProps) {
  return (
    <>
      <div className="h-24 sm:hidden" aria-hidden="true" />
      <div className="safe-bottom fixed inset-x-0 bottom-[4.85rem] z-20 px-3 sm:hidden">
        <div className="mx-auto max-w-6xl rounded-[1.5rem] border border-white/70 bg-white/92 p-3 shadow-soft backdrop-blur">
          {children}
        </div>
      </div>
    </>
  )
}
