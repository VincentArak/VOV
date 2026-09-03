import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import type { Task } from '../types'
import { PRIORITY_COLORS } from '../constants'
import {
  addDays,
  daysBetween,
  eachDayInclusive,
  isOverdue,
  isTaskOpen,
  startOfDay,
} from '../utils'
import { cn } from '../utils'

const DAY_WIDTH = 52
const ROW_HEIGHT = 44
const LABEL_WIDTH = 220

// Timeline lines reuse the quest-difficulty scale so a task reads the
// same here as it does in the quest log.
const LINE_COLORS: Record<Task['priority'], string> = {
  low: 'bg-qd-trivial',
  medium: 'bg-qd-standard',
  high: 'bg-qd-difficult',
  urgent: 'bg-qd-impossible',
}

const ARROW_COLORS: Record<Task['priority'], string> = {
  low: 'border-l-qd-trivial',
  medium: 'border-l-qd-standard',
  high: 'border-l-qd-difficult',
  urgent: 'border-l-qd-impossible',
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDayHeader(d: Date, today: Date): string {
  const isToday = dayKey(d) === dayKey(today)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const day = d.getDate()
  return isToday ? `Today · ${day}` : `${weekday} ${day}`
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

interface QuestTimelineProps {
  tasks: Task[]
  pastDays?: number
  futureDays?: number
}

export function QuestTimeline({ tasks, pastDays = 7, futureDays = 28 }: QuestTimelineProps) {
  const today = useMemo(() => startOfDay(new Date()), [])

  const openWithDue = useMemo(
    () =>
      tasks
        .filter((t) => isTaskOpen(t.status) && t.dueDate)
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
    [tasks],
  )

  const openNoDue = useMemo(
    () => tasks.filter((t) => isTaskOpen(t.status) && !t.dueDate),
    [tasks],
  )

  const { rangeStart, days } = useMemo(() => {
    let start = addDays(today, -pastDays)
    let end = addDays(today, futureDays)

    for (const task of openWithDue) {
      const created = startOfDay(new Date(task.createdAt))
      const due = startOfDay(new Date(task.dueDate!))
      if (created < start) start = created
      if (due > end) end = due
    }

    return {
      rangeStart: start,
      days: eachDayInclusive(start, end),
    }
  }, [today, pastDays, futureDays, openWithDue])

  const todayOffset = daysBetween(rangeStart, today)
  const gridWidth = days.length * DAY_WIDTH

  const monthSpans = useMemo(() => {
    const spans: { label: string; start: number; count: number }[] = []
    let i = 0
    while (i < days.length) {
      const month = days[i].getMonth()
      const year = days[i].getFullYear()
      let count = 0
      while (
        i + count < days.length &&
        days[i + count].getMonth() === month &&
        days[i + count].getFullYear() === year
      ) {
        count++
      }
      spans.push({ label: formatMonthLabel(days[i]), start: i, count })
      i += count
    }
    return spans
  }, [days])

  if (openWithDue.length === 0) {
    return (
      <div className="wow-frame p-8 text-center">
        <p className="text-text-muted">No open quests with due dates on the timeline.</p>
        <p className="text-sm text-text-muted/70 mt-1">
          Add a due date to a quest and it will appear here as a line pointing to its deadline.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-sm">
        <div className="overflow-x-auto">
          <div style={{ minWidth: LABEL_WIDTH + gridWidth }}>
            {/* Month headers */}
            <div className="flex border-b border-border bg-surface-overlay/50">
              <div
                className="shrink-0 border-r border-border"
                style={{ width: LABEL_WIDTH }}
              />
              <div className="relative flex" style={{ width: gridWidth, height: 28 }}>
                {monthSpans.map((span) => (
                  <div
                    key={`${span.label}-${span.start}`}
                    className="absolute top-0 h-full flex items-center px-2 text-xs font-medium text-text-muted border-r border-border/50"
                    style={{ left: span.start * DAY_WIDTH, width: span.count * DAY_WIDTH }}
                  >
                    {span.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Day headers */}
            <div className="flex border-b border-border sticky top-0 z-20 bg-surface-raised">
              <div
                className="shrink-0 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted border-r border-border flex items-end"
                style={{ width: LABEL_WIDTH }}
              >
                Quest
              </div>
              <div className="relative flex" style={{ width: gridWidth, height: 48 }}>
                {days.map((day) => {
                  const isToday = dayKey(day) === dayKey(today)
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  return (
                    <div
                      key={dayKey(day)}
                      className={cn(
                        'shrink-0 flex flex-col items-center justify-end pb-2 text-[10px] border-r border-border/40',
                        isToday && 'bg-accent/10 text-accent font-semibold',
                        !isToday && isWeekend && 'text-text-muted/60',
                        !isToday && !isWeekend && 'text-text-muted',
                      )}
                      style={{ width: DAY_WIDTH }}
                    >
                      {formatDayHeader(day, today)}
                    </div>
                  )
                })}
                {/* Today vertical marker in header area */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-accent/60 pointer-events-none z-10"
                  style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                />
              </div>
            </div>

            {/* Task rows */}
            {openWithDue.map((task) => {
              const created = startOfDay(new Date(task.createdAt))
              const due = startOfDay(new Date(task.dueDate!))
              const start = created < rangeStart ? rangeStart : created
              const startOff = daysBetween(rangeStart, start)
              const endOff = daysBetween(rangeStart, due)
              const lineLeft = startOff * DAY_WIDTH + DAY_WIDTH / 2
              const lineWidth = Math.max((endOff - startOff) * DAY_WIDTH, 12)
              const overdue = isOverdue(task.dueDate, task.status)

              return (
                <div
                  key={task.id}
                  className="flex border-b border-border/50 hover:bg-surface-overlay/30 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                >
                  <Link
                    to={`/quests/${task.id}`}
                    className="shrink-0 px-4 flex items-center border-r border-border hover:text-accent transition-colors"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className={cn('text-[10px] truncate', PRIORITY_COLORS[task.priority])}>
                        {overdue ? 'Overdue · ' : ''}
                        Due {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </Link>

                  <div className="relative" style={{ width: gridWidth }}>
                    {/* Day grid background */}
                    {days.map((day, i) => {
                      const isToday = dayKey(day) === dayKey(today)
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6
                      return (
                        <div
                          key={dayKey(day)}
                          className={cn(
                            'absolute top-0 bottom-0 border-r border-border/20',
                            isToday && 'bg-accent/5',
                            isWeekend && !isToday && 'bg-surface-overlay/20',
                          )}
                          style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                        />
                      )
                    })}

                    {/* Today line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-accent/40 pointer-events-none z-10"
                      style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                    />

                    {/* Task line → due date */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 z-20 group"
                      style={{ left: lineLeft, width: lineWidth, height: 20 }}
                    >
                      <div
                        className={cn(
                          'absolute top-1/2 -translate-y-1/2 h-0.5 rounded-full',
                          overdue ? 'bg-danger' : LINE_COLORS[task.priority],
                          overdue && 'opacity-80',
                        )}
                        style={{ left: 0, right: 8 }}
                      />
                      {/* Arrow pointing to due date */}
                      <div
                        className={cn(
                          'absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0',
                          'border-t-[5px] border-t-transparent',
                          'border-b-[5px] border-b-transparent',
                          'border-l-[8px]',
                          overdue ? 'border-l-danger' : ARROW_COLORS[task.priority],
                        )}
                      />
                      {/* Due date dot */}
                      <div
                        className={cn(
                          'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface-raised',
                          overdue ? 'bg-danger' : LINE_COLORS[task.priority],
                        )}
                        title={`Due ${due.toLocaleDateString()}`}
                      />
                      {/* Hover tooltip */}
                      <div className="timeline-ink-tooltip absolute -top-8 right-0 z-30 hidden whitespace-nowrap rounded-sm border border-gold-lo px-2 py-1 text-[10px] group-hover:block">
                        {task.title} → {due.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {openNoDue.length > 0 && (
        <section className="wow-frame p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">
            Open quests without due date ({openNoDue.length})
          </h2>
          <p className="text-xs text-text-muted mb-3">
            These won&apos;t appear on the timeline until you set a deadline.
          </p>
          <div className="space-y-2">
            {openNoDue.slice(0, 8).map((task) => (
              <Link
                key={task.id}
                to={`/quests/${task.id}`}
                className="wow-hilight block rounded-sm border border-frame-dark bg-surface-raised/60 px-3 py-2 text-sm shadow-[0_0_0_1px_rgba(107,74,24,0.35)]"
              >
                {task.title}
              </Link>
            ))}
            {openNoDue.length > 8 && (
              <p className="text-xs text-text-muted">+ {openNoDue.length - 8} more</p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
