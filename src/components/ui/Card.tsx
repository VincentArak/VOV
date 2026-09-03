import { cn } from '../../utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `ornate` uses the full metal-gradient border — reserve it for the
   *  one or two surfaces on a screen that should read as a real window. */
  variant?: 'default' | 'ornate' | 'parchment'
  interactive?: boolean
}

/**
 * Replaces the `rounded-xl border border-border bg-surface-raised p-5`
 * string that was duplicated across Dashboard, Departments, Maps,
 * Network and Settings, so the frame treatment lives in one place.
 */
export function Card({
  variant = 'default',
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'vov-card',
        variant === 'default' && 'wow-frame',
        variant === 'ornate' && 'wow-frame-ornate',
        variant === 'parchment' && 'wow-parchment',
        interactive && 'wow-hilight cursor-pointer transition-shadow',
        interactive &&
          variant === 'default' &&
          'hover:shadow-[0_0_0_2px_var(--color-gold),inset_0_1px_0_rgba(248,231,160,0.3),inset_0_0_18px_rgba(0,0,0,0.7),0_4px_20px_rgba(0,0,0,0.65)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Section heading in the game's ornate face, with the gold rule the
 * panels use to separate blocks.
 */
export function CardTitle({
  children,
  className,
  action,
}: {
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <div className={cn('vov-card-title mb-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-fancy text-sm tracking-wide text-accent">{children}</h2>
        {action}
      </div>
      <div className="wow-divider mt-2" />
    </div>
  )
}
