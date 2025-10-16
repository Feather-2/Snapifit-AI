"use client"

import type React from "react"

interface MuscleDemoProps {
  highlighted?: string[]
}

// 简化的肌肉图占位（后续可替换为更精细的SVG）
export function MuscleDemo({ highlighted = [] }: MuscleDemoProps) {
  const isOn = (key: string) => highlighted.includes(key)
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm font-medium mb-2">肌肉演示</div>
      <svg viewBox="0 0 200 400" className="w-full h-[320px]">
        {/* 胸大肌 */}
        <rect x="70" y="70" width="60" height="30" fill={isOn('chest') ? "#ef4444" : "#e5e7eb"} rx="6" />
        {/* 二头肌 */}
        <rect x="40" y="110" width="20" height="40" fill={isOn('biceps') ? "#f97316" : "#e5e7eb"} rx="6" />
        <rect x="140" y="110" width="20" height="40" fill={isOn('biceps') ? "#f97316" : "#e5e7eb"} rx="6" />
        {/* 三头肌 */}
        <rect x="30" y="150" width="20" height="40" fill={isOn('triceps') ? "#f59e0b" : "#e5e7eb"} rx="6" />
        <rect x="150" y="150" width="20" height="40" fill={isOn('triceps') ? "#f59e0b" : "#e5e7eb"} rx="6" />
        {/* 背阔肌 */}
        <rect x="60" y="110" width="80" height="60" fill={isOn('lats') ? "#22c55e" : "#e5e7eb"} rx="6" />
        {/* 斜方肌 */}
        <rect x="85" y="50" width="30" height="20" fill={isOn('traps') ? "#10b981" : "#e5e7eb"} rx="6" />
        {/* 核心 */}
        <rect x="85" y="160" width="30" height="40" fill={isOn('core') ? "#06b6d4" : "#e5e7eb"} rx="6" />
        {/* 股四头肌 */}
        <rect x="80" y="220" width="15" height="60" fill={isOn('quads') ? "#3b82f6" : "#e5e7eb"} rx="6" />
        <rect x="105" y="220" width="15" height="60" fill={isOn('quads') ? "#3b82f6" : "#e5e7eb"} rx="6" />
        {/* 腘绳肌 */}
        <rect x="80" y="280" width="15" height="60" fill={isOn('hamstrings') ? "#6366f1" : "#e5e7eb"} rx="6" />
        <rect x="105" y="280" width="15" height="60" fill={isOn('hamstrings') ? "#6366f1" : "#e5e7eb"} rx="6" />
        {/* 小腿 */}
        <rect x="80" y="340" width="15" height="40" fill={isOn('calves') ? "#8b5cf6" : "#e5e7eb"} rx="6" />
        <rect x="105" y="340" width="15" height="40" fill={isOn('calves') ? "#8b5cf6" : "#e5e7eb"} rx="6" />
      </svg>
      <div className="text-xs text-muted-foreground">高亮：{highlighted.length > 0 ? highlighted.join(', ') : '无'}</div>
    </div>
  )
}


