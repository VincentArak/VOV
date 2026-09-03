import { useEffect, useState } from 'react'
import { getBlobUrl } from '../db'

export function useBlobUrl(blobId: string | null): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string | null }>({
    id: '',
    url: null,
  })

  useEffect(() => {
    if (!blobId) return

    let objectUrl: string | null = null
    let cancelled = false

    getBlobUrl(blobId).then((u) => {
      if (!cancelled) {
        objectUrl = u
        setLoaded({ id: blobId, url: u })
      }
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [blobId])

  return blobId && loaded.id === blobId ? loaded.url : null
}
