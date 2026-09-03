import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarRange } from 'lucide-react'
import { useState } from 'react'
import { db } from '../db'
import { QuestTimeline } from '../components/QuestTimeline'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { isTaskOpen } from '../utils'

/**
 * The Chronicle.
 *
 * Structured like the game's calendar/timer panels: a row of resource
 * readouts across the top, then the track itself. The three counters use
 * the same treatment as a character sheet's stat block so the numbers
 * read as status rather than decoration.
 */
export function TimelinePage() {
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const [pastDays, setPastDays] = useState('7')
  const [futureDays, setFutureDays] = useState('28')

  const openTasks = tasks.filter((t) => isTaskOpen(t.status))
  const withDue = openTasks.filter((t) => t.dueDate)
  const overdue = withDue.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString()),
  )

  return (
    <div className="max-w-full p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-fancy flex items-center gap-2 text-3xl text-accent [text-shadow:0_0_14px_rgba(255,209,0,0.25),1px_1px_0_#000]">
            <CalendarRange size={26} aria-hidden="true" />
            Chronicle
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Open quests drawn as lines toward their deadlines
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Select
            label="Past"
            value={pastDays}
            onChange={(e) => setPastDays(e.target.value)}
            options={[
              { value: '3', label: '3 days' },
              { value: '7', label: '7 days' },
              { value: '14', label: '14 days' },
              { value: '30', label: '30 days' },
            ]}
            className="w-28"
          />
          <Select
            label="Future"
            value={futureDays}
            onChange={(e) => setFutureDays(e.target.value)}
            options={[
              { value: '14', label: '14 days' },
              { value: '28', label: '28 days' },
              { value: '60', label: '60 days' },
              { value: '90', label: '90 days' },
            ]}
            className="w-28"
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 sm:max-w-md">
        <Stat label="Open" value={openTasks.length} />
        <Stat label="Scheduled" value={withDue.length} />
        <Stat label="Overdue" value={overdue.length} tone="text-danger" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-text-dim">
        <Legend swatch={<span className="h-0.5 w-6 rounded bg-accent" />} label="Today" />
        <Legend swatch={<span className="h-0.5 w-6 rounded bg-q-rare" />} label="Line to deadline" />
        <Legend swatch={<span className="h-2 w-2 rounded-full bg-danger" />} label="Overdue" />
      </div>

      <Card className="overflow-hidden p-3">
        <QuestTimeline tasks={tasks} pastDays={Number(pastDays)} futureDays={Number(futureDays)} />
      </Card>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="px-3 py-2">
      <div className="font-fancy text-[10px] uppercase tracking-[0.15em] text-text-dim">
        {label}
      </div>
      <div className={`tabular text-2xl leading-tight ${value > 0 ? (tone ?? 'text-accent') : 'text-text-dim'}`}>
        {value}
      </div>
    </Card>
  )
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {swatch}
      {label}
    </span>
  )
}
