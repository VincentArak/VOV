import { useBlobUrl } from '../../hooks/useBlobUrl'
import { User } from 'lucide-react'
import { cn } from '../../utils'

export function Avatar({
  blobId,
  name,
  size = 'md',
  className,
}: {
  blobId: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const url = useBlobUrl(blobId)
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size]

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn(sizeClass, 'rounded-full object-cover border-2 border-accent/30', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        sizeClass,
        'rounded-full bg-surface-overlay flex items-center justify-center border-2 border-border',
        className,
      )}
    >
      <User size={size === 'sm' ? 14 : size === 'md' ? 18 : size === 'lg' ? 28 : 40} className="text-text-muted" />
    </div>
  )
}
