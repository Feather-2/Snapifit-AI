// 获取时间段排序权重
export const getTimePeriodOrder = (period?: string): number => {
  switch (period) {
    case 'morning': return 1
    case 'noon': return 2
    case 'afternoon': return 3
    case 'evening': return 4
    default: return 5 // 未知时间段排在最后
  }
}

// 获取时间段的显示标签
export const getTimePeriodDisplayName = (period?: string): string => {
  switch (period) {
    case 'morning': return '上午'
    case 'noon': return '中午'
    case 'afternoon': return '下午'
    case 'evening': return '夜宵'
    default: return '未知时段'
  }
}
