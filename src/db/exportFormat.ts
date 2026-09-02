import type { BlobAsset, DataSnapshot } from '../types'

export type ExportableData = Omit<DataSnapshot, 'id' | 'savedAt'>

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Every path that turns app data into JSON text funnels through
 * serializeAppData: the Settings → Export download and the dev-server local
 * file backup (data/vov-backup.json). Both write outside the browser's own
 * storage, so the GitHub token is stripped here rather than at each call site
 * — that keeps a future third writer from silently leaking it.
 *
 * The IndexedDB snapshot path deliberately does NOT go through here: those
 * snapshots stay inside the same browser profile and restoring one should give
 * the user their token back.
 */
function redactSecrets(settings: ExportableData['settings']) {
  return settings.map((s) => ({ ...s, githubToken: null }))
}

export async function serializeAppData(
  data: ExportableData,
  savedAt = new Date().toISOString(),
): Promise<string> {
  const blobs = await Promise.all(
    data.blobs.map(async (b: BlobAsset) => ({
      ...b,
      data: await blobToBase64(b.data),
    })),
  )

  return JSON.stringify(
    {
      version: 1,
      savedAt,
      departments: data.departments,
      missions: data.missions,
      people: data.people,
      relationships: data.relationships,
      relationshipTypes: data.relationshipTypes,
      blobs,
      maps: data.maps,
      locations: data.locations,
      tasks: data.tasks,
      settings: redactSecrets(data.settings),
    },
    null,
    2,
  )
}
