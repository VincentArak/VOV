import { cn } from '../../utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

/**
 * Button styling follows the game's action-button treatment: a beveled
 * metal edge drawn with layered box-shadows (the border art in WoW
 * overflows the button's own bounds, which is what gives it weight),
 * and an additive white overlay on hover rather than a colour swap.
 */
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
        'wow-hilight relative inline-flex cursor-pointer items-center justify-center gap-1.5 rounded font-medium',
        'transition-[box-shadow,transform] duration-100',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:saturate-50',
        // Pressing physically depresses the button, matching UI-Quickslot-Depress.
        'active:translate-y-px enabled:active:shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-1.5 text-sm',
        variant === 'primary' && [
          'border border-frame-dark bg-gradient-to-b from-gold to-gold-mid text-frame-dark',
          'shadow-[0_0_0_1px_var(--color-gold-lo),inset_0_1px_0_rgba(248,231,160,0.65),inset_0_-1px_0_rgba(0,0,0,0.35)]',
          'font-semibold [text-shadow:0_1px_0_rgba(248,231,160,0.4)]',
        ],
        variant === 'secondary' && [
          'border border-frame-dark bg-gradient-to-b from-surface-overlay to-surface-raised text-text',
          'shadow-[0_0_0_1px_var(--color-gold-lo),inset_0_1px_0_rgba(248,231,160,0.18),inset_0_0_8px_rgba(0,0,0,0.6)]',
        ],
        variant === 'danger' && [
          'border border-frame-dark bg-gradient-to-b from-[#5a1414] to-[#3a0d0d] text-danger',
          'shadow-[0_0_0_1px_#6b1a1a,inset_0_1px_0_rgba(255,120,120,0.2),inset_0_0_8px_rgba(0,0,0,0.7)]',
        ],
        variant === 'ghost' && 'text-text-muted hover:text-accent',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
