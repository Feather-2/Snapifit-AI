"use client"

import type React from "react"
import { useMemo } from "react"

interface WeeklyPlannerProps {
  selected?: number // 0-6 (Mon-Sun)
  onSelect?: (dayIndex: number) => void
}

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

export function WeeklyPlanner({ selected = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, onSelect }: WeeklyPlannerProps) {
  const today = useMemo(() => (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1), [])

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((d, idx) => {
        const isToday = idx === today
        const isActive = idx === selected
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect?.(idx)}
            className={`h-10 rounded-md text-sm border transition ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'} ${isToday && !isActive ? 'ring-1 ring-primary/60' : ''}`}
            aria-label={`Select ${d}`}
          >
            {d}
          </button>
        )
      })}
    </div>
  )
}






