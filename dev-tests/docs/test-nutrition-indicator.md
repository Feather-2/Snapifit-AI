# 餐食营养指示灯功能测试

## 🚨 功能概述

新增的营养指示灯功能为高热量餐食（≥350大卡）提供快速营养分析：

### 触发条件
- **仅限食物类型**：只在食物分组中显示，运动分组不显示
- **热量阈值**：当某个时间段（上午/中午/下午/夜宵）的总热量 ≥ 350大卡时显示
- **视觉标识**：橙色闪电图标 ⚡

### 分析内容
点击指示灯后显示两部分营养分析：

#### 1. 当前餐次营养分析
- 该时间段所有食物的营养汇总
- 宏量营养素分布（蛋白质、碳水、脂肪百分比）
- 可视化营养比例条

#### 2. 累计营养分析  
- 从一天开始到当前餐次的所有营养汇总
- 与每日目标的对比进度
- 剩余或超出目标的提示

## 🎯 界面设计

### 指示灯位置
```
┌─────────────────────────────────────────────────────────┐
│ 🕐 上午 (3项)                    ⚡ 450 kcal ▼         │
│ 🕐 中午 (2项)                      280 kcal ▼         │  
│ 🕐 下午 (1项)                    ⚡ 380 kcal ▼         │
│ 🕐 夜宵 (1项)                      150 kcal ▼         │
└─────────────────────────────────────────────────────────┘
```

### 营养分析弹窗
```
┌─────────────────────────────────────────────────────────┐
│ ⚡ 上午 营养分析                                  ✕     │
├─────────────────────────────────────────────────────────┤
│ 当前餐次：上午                                          │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                      │
│ │450  │ │18.5g│ │45.2g│ │15.8g│                      │
│ │kcal │ │蛋白质│ │碳水  │ │脂肪 │                      │
│ │     │ │16.4%│ │40.2%│ │31.6%│                      │
│ └─────┘ └─────┘ └─────┘ └─────┘                      │
│                                                         │
│ 宏量营养素分布                                          │
│ ████████████████████████████████████████████████████    │
│ 蛋白质 16.4%    碳水 40.2%    脂肪 31.6%               │
├─────────────────────────────────────────────────────────┤
│ 累计营养摄入                                            │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                      │
│ │1250 │ │52.3g│ │145.8g│ │48.2g│                     │
│ │kcal │ │蛋白质│ │碳水  │ │脂肪 │                      │
│ │62.5%│ │16.8%│ │46.7%│ │34.7%│                      │
│ └─────┘ └─────┘ └─────┘ └─────┘                      │
│                                                         │
│ 每日进度                                                │
│ ████████████████████████████████████████████████████    │
│ 1250 / 2000 kcal                                       │
│ 剩余目标 750 kcal                                       │
├─────────────────────────────────────────────────────────┤
│ 上午 食物清单                                           │
│ 全麦面包 (80g)                              212 kcal   │
│ 牛奶 (200ml)                               134 kcal   │
│ 鸡蛋 (1个)                                 104 kcal   │
└─────────────────────────────────────────────────────────┘
```

## 🧮 计算逻辑

### 热量阈值判断
```typescript
// 按时间段分组计算总热量
const groupTotalCalories = group.entries.reduce((total, entry) => {
  return total + (entry.total_nutritional_info_consumed?.calories || 0)
}, 0)

// 判断是否显示指示灯
const showIndicator = type === 'food' && groupTotalCalories >= 350
```

### 累计营养计算
```typescript
// 获取截至当前餐次的所有食物
const cumulativeEntries = groupedEntries
  .filter(g => g.order <= currentGroupOrder) // 按时间顺序过滤
  .flatMap(g => g.entries as FoodEntry[])    // 展平所有食物条目

// 计算累计营养
const cumulativeNutrition = cumulativeEntries.reduce((acc, entry) => {
  const nutrition = entry.total_nutritional_info_consumed
  return {
    calories: acc.calories + (nutrition?.calories || 0),
    protein: acc.protein + (nutrition?.protein || 0),
    carbs: acc.carbs + (nutrition?.carbohydrates || 0),
    fat: acc.fat + (nutrition?.fat || 0)
  }
}, { calories: 0, protein: 0, carbs: 0, fat: 0 })
```

### 宏量营养素百分比
```typescript
// 计算各营养素的热量贡献百分比
const proteinPercent = (protein * 4 / totalCalories) * 100  // 蛋白质 4kcal/g
const carbsPercent = (carbs * 4 / totalCalories) * 100     // 碳水 4kcal/g  
const fatPercent = (fat * 9 / totalCalories) * 100        // 脂肪 9kcal/g
```

## 🎨 视觉设计

### 指示灯样式
- **图标**：闪电 ⚡ (Zap icon)
- **颜色**：橙色 (#f97316)
- **填充**：实心填充
- **大小**：12px (h-3 w-3)
- **悬停效果**：浅橙色背景

### 营养卡片配色
- **卡路里**：橙色系 (orange-50/600)
- **蛋白质**：蓝色系 (blue-50/600)  
- **碳水化合物**：绿色系 (green-50/600)
- **脂肪**：紫色系 (purple-50/600)

### 进度条配色
- **蛋白质**：蓝色 (#3b82f6)
- **碳水化合物**：绿色 (#10b981)
- **脂肪**：紫色 (#8b5cf6)

## 🔧 技术实现

### 组件结构
```
GroupedEntriesDisplay
├── 指示灯按钮 (条件渲染)
├── NutritionAnalysisDialog
│   ├── 当前餐次分析
│   ├── 累计营养分析  
│   └── 食物清单
└── 状态管理
    ├── nutritionDialogOpen
    └── selectedMealData
```

### 事件处理
```typescript
const handleNutritionAnalysis = (group: TimeGroup) => {
  const mealEntries = group.entries as FoodEntry[]
  const cumulativeEntries = getCumulativeEntries(group.order)
  
  setSelectedMealData({
    mealEntries,
    cumulativeEntries, 
    mealLabel: group.label
  })
  setNutritionDialogOpen(true)
}
```

## 🧪 测试场景

### 场景1：单餐高热量
```
上午餐次：
- 汉堡 (1个) - 280 kcal
- 薯条 (1份) - 120 kcal  
总计：400 kcal ≥ 350 → 显示指示灯 ⚡
```

### 场景2：多食物累计高热量
```
中午餐次：
- 米饭 (150g) - 180 kcal
- 红烧肉 (100g) - 200 kcal
总计：380 kcal ≥ 350 → 显示指示灯 ⚡
```

### 场景3：低热量餐次
```
下午餐次：
- 苹果 (1个) - 80 kcal
- 酸奶 (1杯) - 120 kcal
总计：200 kcal < 350 → 不显示指示灯
```

### 场景4：累计分析验证
```
一天的进食记录：
上午：450 kcal (显示指示灯)
中午：380 kcal (显示指示灯) 
下午：200 kcal (不显示指示灯)

点击中午指示灯：
- 当前餐次：380 kcal
- 累计摄入：450 + 380 = 830 kcal
- 目标进度：830/2000 = 41.5%
```

## 🚀 用户价值

### 1. 快速识别高热量餐食
- 一眼识别需要关注的餐次
- 避免无意识的高热量摄入

### 2. 详细营养分析
- 了解餐食的营养构成
- 优化宏量营养素比例

### 3. 进度跟踪
- 实时了解每日目标完成情况
- 合理安排后续饮食

### 4. 教育价值
- 提高营养意识
- 培养健康饮食习惯

这个功能为用户提供了直观、详细的营养分析工具，有助于更好地管理饮食健康！🎯
