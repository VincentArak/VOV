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
      settings: data.settings,
    },
    null,
    2,
  )
}
