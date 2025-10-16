## 训练中心（Exercise Center）规划与实现记录

> 持续更新文档：记录产品诉求、信息架构、数据模型、接口与组件、里程碑与变更日志。

### 背景与目标
- **整合**：将“文本记录”“动作库”“训练模板/计划”“实时训练面板”统一为一个中心，减少重复与跳转成本。
- **模板化**：支持三分化/四分化等计划，按日/肌群/动作进行安排，一键开始训练。
- **AI 与 MCP**：
  - 动作发现：通过 MCP 工具搜索平台（先用内置 EXERCISE_SEARCH，后续可接小红书 provider），将新动作纳入动作库。
  - 计划微调：根据实时表现（RPE、完成度、心率）动态调整组数/重量/休息。
- **即时记录**：实时训练面板提供计时、快速记录与“复用上一组”，支持快速文本指令解析（掉重、超级组、组间休息）。

### 信息架构（IA）
- Tab 1：Plan（计划/模板）
  - 模板管理：创建/编辑/复制/归档模板（如三分化）。
  - 日程视图：按周显示今天练什么；从模板选日开始训练。
- Tab 2：Live（实时训练）
  - 固定底部或抽屉面板：计时器、下一组倒计时、复用上一组、超级组/掉重一键标记。
  - 快速文本输入：例如“卧推 5x5@100kg 休90s”“这组做12，从120kg→110kg 递减”。
- Tab 3：Library（动作库）
  - 来自历史记录与预置库的聚合，支持合并/删除/标签与肌群；可从 AI/MCP 添入新动作。

### 数据模型（最小增强，兼容现有类型）
- `ExerciseDef`（已存在于 `lib/exercise-data.ts`）：新增可选元数据（后续迭代）：器械/标签/别名。
- `WorkoutTemplate`
  - id, name, splitType (e.g. push/pull/legs), days: Array<{ id, label, muscles: string[], exercises: Array<{ exerciseId, targetSets, targetReps, targetWeightKg?, restSec? }> }>, defaultRestSec
- `WorkoutSession`
  - id, date, templateId?, status: 'planned'|'ongoing'|'done', notes?,
  - exercises: Array<{ exerciseId, name, sets: SetRecord[], totalTimeSec?, volumeKg? }>
- `SetRecord`
  - setIndex, reps, weightKg?, rir?, rpe?, isDropSet?, isSuperset?, restSec?, notes?

说明：首期可前端持久化（localStorage/IndexedDB），或以简单 API 写入后端 JSON/表。后续若落库再迁移。

### 功能要点与实现策略
1) 动作库聚合
   - 从历史 `exerciseEntries` + `EXERCISE_LIBRARY` 去重聚合；支持合并/删除/标签/别名。提供搜索与筛选（肌群/类型/器械）。
2) 模板化（计划）
   - 模板编辑器：拖拽或选择动作，设置目标组/次数/重量/休息；提供“三分化”示例模板。
   - 一键“开始训练”生成当日 `WorkoutSession` 并切到 Live。
3) 实时训练面板（Live）
   - 计时器（总时长、组间倒计时），大按键，复用上一组；超级组/掉重快速标记；移动端 Drawer 交互。
   - 文本解析器：将自然语言转换为结构化 `SetRecord`，解析后回显可编辑。
4) AI / MCP 集成
   - 动作发现：先接内置 `EXERCISE_SEARCH`；扩展阶段添加小红书 provider（桥接 `/api/mcp/bridge`）。
   - 计划微调：调用 `WORKOUT_PLANNER` 或自定义工具，根据当日表现返回建议并应用到当前 Session。
5) 文本记录打通
   - 保持仪表盘自由文本入口；新增解析 API `/api/parse-exercise-text`，将文本映射为结构化记录（并保留原文本为备注）。

### AI 文本解析集成与链路
- 复用首页解析链：`/api/openai/parse-shared`，`type: "exercise"`。
- 前端组件：`components/exercise/exercise-ai-parse.tsx`，参数：`locale`。
  - 读取本地 `aiConfig` 与 `userProfile.weight`。
  - 调用体：
    - POST `/api/openai/parse-shared`，body: `{ text, lang, type: 'exercise', userWeight, aiConfig, currentTime }`。
  - 结果写入：`IndexedDB('healthLogs')` 的今日日志，合并 `exerciseEntries` 并回推云端 `pushData`。
- 训练页接入：`app/[locale]/exercise/page.tsx` 在 Quick 区域与 Drawer 内引入 `<ExerciseAIParse />`。
- 错误处理：提示 Toast（服务不可用/限额/未解析到结果）。


### 架构一致性调整
- 国际化：`ExerciseAIParse` 使用 `useTranslation('exercisePage')`，新增 `messages/zh.json` 与 `messages/en.json` 下 `exercisePage.aiParse.*` 文案键。
- 移动端：解析输入仅在 Drawer 内显示；桌面端在 Quick 卡片与并排视图中显示，避免重复与挤占空间。
- 实时面板：新增 `WorkoutLivePanel`，支持解析预览、合并保存与清空预览，文案键 `exercisePage.livePanel.*`。
- 动作发现：新增 `ExerciseAIDiscover`，走 `/api/mcp/health-data` 的 `EXERCISE_SEARCH`，将候选加入库；文案键 `exercisePage.aiDiscover.*`。

### 受影响的文件/模块（首期）
- `app/[locale]/exercise/page.tsx`：改为 Plan/Live/Library 三 Tab；接入实时面板。
- `components/exercise/*`：复用 `ExerciseQuickLog`/`ExerciseLibrary`，新增 `WorkoutPlanEditor`、`WorkoutLivePanel`。
- `app/[locale]/page.tsx`：文本入口对接解析 API（不影响原使用方式）。
- `app/api/mcp/health-data`：复用内置工具；外部 provider 通过 `/api/mcp/bridge`。
- 新增：`app/api/parse-exercise-text/route.ts`（MVP 可先本地解析，不依赖大模型）。

### MVP 范围（两周）
- 动作库聚合与 CRUD（合并/删除/标签）。
- 模板（Plan）基础：三分化模板，按日开始训练。
- 实时面板（Live）基础：计时、组记录、复用上一组、掉重标记。
- 文本解析基础语法：`组数x次数@重量kg`、`掉重A→B`、`休S秒`。
- AI 动作发现：先接 `EXERCISE_SEARCH`。

### 文本解析首批语法规则（MVP）
- 统一约定：若未显式单位，重量单位默认 kg，休息默认秒；范围或箭头表示掉重。
- 基本格式：
  - `动作 组x次@重量`：如 “卧推 5x5@100kg” → 5 组，每组 5 次，重量 100 kg。
  - `动作 次数@重量`：如 “卧推 12@60kg” → 1 组 12 次，60 kg。
  - `掉重`：`A→B` 或 `A-…-B`，如 “这组做12，从120kg→110kg 递减” → 标记 `isDropSet=true`，并生成分段重量；未给分段数则按两段合并记录（120→110）。
  - `休息`：`休90s` 或 `rest 90s` 或 `休 90` → `restSec=90`。
  - `超级组`：使用 `+` 或 `superset`，如 “卧推+划船 3x12@60kg/12@40kg” → 两动作并列同组序。
  - 可选强度：`RPE8`/`RIR2` → 记录至对应字段。
- 解析输出（结构化）：
  - `exerciseId|name`、`sets: Array<SetRecord>`，SetRecord 含 `setIndex,reps,weightKg,restSec,isDropSet,isSuperset,rir,rpe,notes`。
  - 若无法完全解析，保留原句到 `notes`，并仅提取可确定字段。

示例：
- “卧推 5x5@100kg 休90s” → 生成 5 组，每组 `{ reps:5, weightKg:100, restSec:90 }`。
- “这组做了12个，从120kg-110kg递减” → 当前选中动作追加一组 `{ reps:12, weightKg:[120,110], isDropSet:true }`（储存时可拆分为两次子 effort）。
- “卧推+引体向上 3x12@60kg/12@自重 RPE8” → 两个动作，每组并列，分别赋值重量与强度。

解析优先级：先规则匹配（正则），再轻量 NLP（可选），最后兜底为备注。

### 交互草图（Plan / Live / Library）
- Plan
  - 顶部：模板选择（下拉/卡片）+ “新建模板”。
  - 中段：周视图（Mon-Sun），点击某天进入“动作编辑”；右侧展示“历史常用动作”。
  - 底部：`开始训练` 按钮（生成 `WorkoutSession` 并跳转 Live）。
- Live
  - 顶部：当前训练标题（模板/自由训练）+ 总计时。
  - 中段：当前动作卡片（大按钮：+1 组／复用上一组／标记掉重），支持横向滑动切换动作；
  - 底部固定输入区：
    - 快速输入框（支持上述语法，回车即解析入库并回显可编辑）。
    - 休息倒计时控件；一键跳过/加 30s。
  - 移动端：使用 Drawer 展示动作详细与组历史；离屏保留计时。
- Library
  - 顶部：搜索/筛选（肌群/类型/器械/标签）。
  - 列表：来源标记（历史/预置/AI），支持合并与删除、编辑别名与标签；
  - 右上：`从 AI 添加`（触发 MCP 查询对话，选择后入库）。

可访问性：关键操作（开始/暂停/+1 组）均提供键盘与触控双路径；状态有清晰视觉反馈与撤销。

### 后续路线
- 小红书 provider：`search_xhs_exercises`（合规抓取/速率限制/只存链接与元信息）。
- 计划微调高级版：基于 RPE/HRV/完成度的自适应；负荷管理与疲劳跟踪。
- 更丰富的统计与可视化（体积、强度、PR、肌群覆盖）。

### Changelog
- v0.1.0（初始化）
  - 建立“训练中心”文档与总体方案；定义 IA、数据模型、MVP 与受影响文件。
  - 新增：文本解析首批语法规则与 Plan/Live/Library 交互草图。
  - 新增：AI 文本解析组件接入训练页；完成 i18n 与移动端显示策略。
  - 新增：`WorkoutLivePanel`（解析预览/确认保存）；`ExerciseAIDiscover`（从AI添加动作）。


