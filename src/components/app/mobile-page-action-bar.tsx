type MobilePageActionBarProps = {
  children: React.ReactNode
}

export function MobilePageActionBar({ children }: MobilePageActionBarProps) {
  return (
    <>
      <div className="h-24 sm:hidden" aria-hidden="true" />
      <div className="safe-bottom fixed inset-x-0 bottom-[5rem] z-20 px-4 sm:hidden">
        <div className="mx-auto max-w-6xl rounded-[1rem] border border-border/70 bg-white/96 p-3 shadow-soft backdrop-blur">
          {children}
        </div>
      </div>
    </>
  )
}
