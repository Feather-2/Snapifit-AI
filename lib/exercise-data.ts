export interface ExerciseDef {
  id: string
  name: string
  type: 'strength' | 'cardio' | 'flexibility'
  muscles: string[]
  defaultSets?: number
  defaultReps?: number
  defaultWeightKg?: number
  defaultDurationMin?: number
}

export const EXERCISE_LIBRARY: ExerciseDef[] = [
  { id: 'bench_press', name: '杠铃卧推', type: 'strength', muscles: ['chest', 'triceps'], defaultSets: 4, defaultReps: 8, defaultWeightKg: 40 },
  { id: 'squat', name: '深蹲', type: 'strength', muscles: ['quads', 'hamstrings', 'glutes', 'core'], defaultSets: 4, defaultReps: 6, defaultWeightKg: 60 },
  { id: 'deadlift', name: '硬拉', type: 'strength', muscles: ['hamstrings', 'glutes', 'lats', 'core'], defaultSets: 3, defaultReps: 5, defaultWeightKg: 70 },
  { id: 'pull_up', name: '引体向上', type: 'strength', muscles: ['lats', 'biceps'], defaultSets: 4, defaultReps: 6 },
  { id: 'row', name: '划船机', type: 'cardio', muscles: ['back', 'legs', 'core'], defaultDurationMin: 20 },
  { id: 'run', name: '跑步', type: 'cardio', muscles: ['quads', 'calves', 'hamstrings'], defaultDurationMin: 30 },
  { id: 'cycle', name: '骑行', type: 'cardio', muscles: ['quads', 'calves'], defaultDurationMin: 30 },
  { id: 'plank', name: '平板支撑', type: 'flexibility', muscles: ['core'], defaultDurationMin: 5 },
]


