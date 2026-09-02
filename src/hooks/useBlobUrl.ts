import { useEffect, useState } from 'react'
import { getBlobUrl } from '../db'

export function useBlobUrl(blobId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blobId) {
      setUrl(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    getBlobUrl(blobId).then((u) => {
      if (!cancelled) {
        objectUrl = u
        setUrl(u)
      }
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [blobId])

  return url
}
