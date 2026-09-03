import { cn } from '../../utils'
import { FIELD_CLASS, LABEL_CLASS } from './Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className={LABEL_CLASS}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(FIELD_CLASS, 'min-h-[80px] resize-y leading-relaxed', className)}
        {...props}
      />
    </div>
  )
}
