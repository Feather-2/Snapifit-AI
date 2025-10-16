# 双向MCP架构：生产者 + 消费者

## 架构概述

健康应用既是**MCP服务提供者**（向外暴露11种健康工具），也是**MCP服务消费者**（接入第三方工具）。

```
                    ┌─────────────────────────────────────────┐
                    │           健康应用核心                    │
                    ├─────────────────────────────────────────┤
                    │  Chat System + Health Data + AI Memory │
                    └──────────────┬──────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          │                          ▼
┌──────────────────┐               │               ┌──────────────────┐
│   MCP Producer   │               │               │   MCP Consumer   │
│   (提供11种工具)  │               │               │   (接入第三方)    │
├──────────────────┤               │               ├──────────────────┤
│                  │               │               │                  │
│ 🔧 健康数据工具   │               │               │ 🌐 外部API工具    │
│ - get_user_profile│              │               │ - weather_api    │
│ - get_daily_logs  │              │               │ - news_search    │
│ - nutrition_calc  │              │               │ - translator     │
│ - exercise_search │              │               │ - file_manager   │
│ - bmi_calculator  │              │               │ - web_scraper    │
│ - meal_planner    │              │               │                  │
│ - weight_tracker  │              │               │ 🤖 AI增强工具     │
│ - sleep_analyzer  │              │               │ - code_analyzer  │
│ - habit_tracker   │              │               │ - image_generator│
│ - health_insights │              │               │ - data_visualizer│
│ - export_data     │              │               │ - pdf_processor  │
│                  │               │               │                  │
├──────────────────┤               │               ├──────────────────┤
│  🌍 外部访问接口  │               │               │  🔒 安全调用机制  │
│  - HTTP API      │               │               │  - 权限验证       │
│  - WebSocket     │               │               │  - 参数过滤       │
│  - stdio         │               │               │  - 结果清洗       │
│  - OAuth认证     │               │               │  - 超时控制       │
└──────────────────┘               │               └──────────────────┘
        │                          │                          │
        │                          │                          │
        ▼                          │                          ▼
┌──────────────────┐               │               ┌──────────────────┐
│   外部AI应用      │               │               │    第三方MCP     │
│   - FastGPT      │               │               │    - 本地工具     │
│   - Custom Bot   │               │               │    - 云端服务     │
│   - 第三方集成    │               │               │    - 专业工具     │
└──────────────────┘               │               └──────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │         统一调度中心          │
                    │   - 工具路由                 │
                    │   - 上下文管理               │
                    │   - 权限控制                 │
                    │   - 结果聚合                 │
                    └─────────────────────────────┘
```

## 核心价值

### 1. **作为MCP服务器的价值**
- **数据生态**: 成为健康数据的标准化入口
- **AI增强**: 为第三方AI提供健康领域的专业能力
- **商业价值**: 健康数据API服务的商业化可能

### 2. **作为MCP客户端的价值**
- **功能扩展**: 接入专业工具增强健康分析能力
- **生态集成**: 与现有工具生态无缝连接
- **用户体验**: 一站式解决用户的多元化需求

## 11种健康MCP工具服务

```typescript
// 提供给外部的健康工具
export const HEALTH_MCP_TOOLS = {
  // 用户数据访问
  'get_user_profile': {
    description: '获取用户健康档案',
    inputSchema: { userId: 'string', fields?: 'string[]' },
    permissions: ['read:profile']
  },

  'get_daily_logs': {
    description: '获取每日健康日志',
    inputSchema: { userId: 'string', date?: 'string', days?: 'number' },
    permissions: ['read:health_data']
  },

  // 营养分析工具
  'nutrition_calculator': {
    description: '营养成分分析计算',
    inputSchema: { foods: 'Food[]', portions?: 'number[]' },
    permissions: ['read:nutrition_data']
  },

  'meal_planner': {
    description: '个性化膳食规划',
    inputSchema: { userId: 'string', goals: 'Goal[]', days: 'number' },
    permissions: ['read:profile', 'generate:meal_plan']
  },

  // 运动健身工具
  'exercise_search': {
    description: '运动数据库搜索',
    inputSchema: { query: 'string', type?: 'string', level?: 'string' },
    permissions: ['read:exercise_data']
  },

  'workout_planner': {
    description: '训练计划生成',
    inputSchema: { userId: 'string', goals: 'Goal[]', equipment?: 'string[]' },
    permissions: ['read:profile', 'generate:workout_plan']
  },

  // 健康分析工具
  'bmi_calculator': {
    description: 'BMI和身体成分分析',
    inputSchema: { weight: 'number', height: 'number', age?: 'number' },
    permissions: ['calculate:health_metrics']
  },

  'weight_tracker': {
    description: '体重趋势分析',
    inputSchema: { userId: 'string', timeRange?: 'string' },
    permissions: ['read:health_data', 'analyze:trends']
  },

  'sleep_analyzer': {
    description: '睡眠质量分析',
    inputSchema: { userId: 'string', period?: 'string' },
    permissions: ['read:sleep_data', 'analyze:sleep']
  },

  // 数据洞察工具
  'health_insights': {
    description: '健康数据智能洞察',
    inputSchema: { userId: 'string', analysisType: 'string' },
    permissions: ['read:health_data', 'generate:insights']
  },

  'export_data': {
    description: '健康数据导出',
    inputSchema: { userId: 'string', format: 'string', dateRange: 'DateRange' },
    permissions: ['read:health_data', 'export:data']
  }
}
```

## AI上下文获取机制

### 1. **实时健康上下文**
```typescript
// AI可以通过MCP获取用户当前状态
const healthContext = await mcpServer.callTool('get_user_profile', {
  userId: 'user123',
  fields: ['current_goals', 'dietary_restrictions', 'health_conditions']
})

const recentData = await mcpServer.callTool('get_daily_logs', {
  userId: 'user123',
  days: 7
})

// AI基于实时数据生成个性化建议
```

### 2. **权限控制的数据访问**
```typescript
// 不同的AI应用有不同的数据访问权限
const permissions = {
  'nutrition_ai': ['read:profile', 'read:nutrition_data', 'generate:meal_plan'],
  'fitness_ai': ['read:profile', 'read:exercise_data', 'generate:workout_plan'],
  'doctor_ai': ['read:all_health_data', 'analyze:health_risks']
}
```

## HTTP接入实现

### 1. **RESTful MCP接口**
```typescript
// GET /api/mcp/tools - 获取可用工具列表
// POST /api/mcp/call - 调用特定工具
// GET /api/mcp/health/{userId}/profile - 快捷健康数据接口
// POST /api/mcp/auth/token - OAuth认证
```

### 2. **第三方集成示例**
```javascript
// 第三方AI应用调用健康数据
const healthAPI = new HealthMCPClient({
  baseUrl: 'https://your-health-app.com/api/mcp',
  apiKey: 'your-api-key'
})

const userProfile = await healthAPI.getUserProfile('user123')
const nutritionAdvice = await healthAPI.generateMealPlan({
  userId: 'user123',
  goals: ['weight_loss', 'high_protein'],
  days: 7
})
```

## 安全考虑

### 1. **分层安全**
```typescript
// 对内工具（高权限）
const INTERNAL_TOOLS = ['get_user_profile', 'get_daily_logs', 'export_data']

// 对外工具（限制权限）
const PUBLIC_TOOLS = ['nutrition_calculator', 'bmi_calculator', 'exercise_search']

// 计算工具（无需用户数据）
const COMPUTE_TOOLS = ['nutrition_calculator', 'bmi_calculator']
```

### 2. **OAuth + 细粒度权限**
```typescript
const scopes = {
  'read:basic_profile': '基本档案信息',
  'read:health_data': '健康数据读取',
  'read:nutrition_data': '营养数据读取',
  'generate:meal_plan': '膳食计划生成',
  'analyze:trends': '趋势分析',
  'export:data': '数据导出'
}
```

这样的架构既保持了MCP的标准化优势，又提供了强大的健康数据服务能力，还能安全地接入第三方工具扩展功能。

---

## 参考

- 更直观的架构与调用流程图，请查看 `docs/MCP-DIAGRAMS.md`。