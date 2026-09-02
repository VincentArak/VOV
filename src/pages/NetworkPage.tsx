import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { getTypeName } from '../constants/relationships'
import {
  RelationshipGraph,
  RelationshipLegend,
} from '../components/RelationshipGraph'
import { RelationshipTypeManager } from '../components/RelationshipTypeManager'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'

export function NetworkPage() {
  const people = useLiveQuery(() => db.people.toArray()) ?? []
  const relationships = useLiveQuery(() => db.relationships.toArray()) ?? []
  const typeDefs =
    useLiveQuery(() => db.relationshipTypes.orderBy('sortOrder').toArray()) ?? []
  const [activeTypeIds, setActiveTypeIds] = useState<string[]>([])

  const toggleType = (typeId: string) => {
    setActiveTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId],
    )
  }

  const filterTypeIds = activeTypeIds.length > 0 ? activeTypeIds : undefined

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fancy text-3xl text-accent [text-shadow:0_0_14px_rgba(255,209,0,0.25),1px_1px_0_#000]">The Realm</h1>
          <p className="text-sm text-text-muted mt-1">
            {people.length} people · {relationships.length} relationship
            {relationships.length !== 1 ? 's' : ''} · {typeDefs.length} type
            {typeDefs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/departments">
          <Button variant="secondary">Manage People</Button>
        </Link>
      </div>

      {people.length < 2 ? (
        <EmptyState
          title="Need at least 2 people"
          description="Add people in Departments, then define relationships on their profile pages"
          action={
            <Link to="/departments">
              <Button>Go to Departments</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-4">
            <p className="text-xs text-text-muted mb-2 uppercase tracking-wider font-medium">
              Filter by type (click to toggle)
            </p>
            <RelationshipLegend
              typeDefs={typeDefs}
              activeTypeIds={activeTypeIds}
              onToggle={toggleType}
            />
          </div>

          <RelationshipGraph
            people={people}
            relationships={relationships}
            typeDefs={typeDefs}
            filterTypeIds={filterTypeIds}
            height={520}
          />

          <p className="text-xs text-text-muted mt-3 text-center">
            Drag nodes to rearrange · Click a node to open their profile
          </p>

          <div className="mt-8">
            <RelationshipTypeManager />
          </div>

          {relationships.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">
                All Relationships
              </h2>
              <div className="space-y-2">
                {relationships
                  .filter((r) => !filterTypeIds || filterTypeIds.includes(r.type))
                  .map((rel) => {
                    const from = people.find((p) => p.id === rel.fromPersonId)
                    const to = people.find((p) => p.id === rel.toPersonId)
                    if (!from || !to) return null
                    return (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between rounded-sm border border-frame-dark px-3 py-2 text-sm"
                      >
                        <span>
                          <Link to={`/people/${from.id}`} className="hover:text-accent">
                            {from.name}
                          </Link>
                          <span className="text-text-muted mx-2">
                            {getTypeName(typeDefs, rel.type)}
                          </span>
                          <Link to={`/people/${to.id}`} className="hover:text-accent">
                            {to.name}
                          </Link>
                        </span>
                      </div>
                    )
                  })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
