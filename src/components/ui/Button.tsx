import { cn } from '../../utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm',
        variant === 'primary' && 'bg-accent text-surface hover:bg-accent-dim',
        variant === 'secondary' && 'bg-surface-overlay text-text hover:bg-border',
        variant === 'danger' && 'bg-danger/20 text-danger hover:bg-danger/30',
        variant === 'ghost' && 'text-text-muted hover:text-text hover:bg-surface-overlay',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
