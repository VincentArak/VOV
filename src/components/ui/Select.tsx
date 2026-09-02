import { cn } from '../../utils'
import { FIELD_CLASS, LABEL_CLASS } from './Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className={LABEL_CLASS}>
          {label}
        </label>
      )}
      <select id={inputId} className={cn(FIELD_CLASS, 'cursor-pointer', className)} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface-raised text-text">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
