import { cn } from '../../utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

/** Inset field styling — the game's editboxes read as carved into the
 *  panel rather than sitting on top of it. */
const FIELD =
  'vov-field rounded-sm border border-frame-dark bg-surface-sunken px-3 py-1.5 text-sm text-text ' +
  'shadow-[inset_0_1px_4px_rgba(0,0,0,0.85),0_0_0_1px_rgba(107,74,24,0.55)] ' +
  'placeholder:text-text-dim focus:outline-none ' +
  'focus:shadow-[inset_0_1px_4px_rgba(0,0,0,0.85),0_0_0_1px_var(--color-gold),0_0_8px_rgba(255,209,0,0.35)]'

const LABEL = 'vov-field-label font-fancy text-[11px] tracking-wide text-accent-dim'

export function Input({ label, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className={LABEL}>
          {label}
        </label>
      )}
      <input id={inputId} className={cn(FIELD, className)} {...props} />
    </div>
  )
}

export { FIELD as FIELD_CLASS, LABEL as LABEL_CLASS }
