# MCP 架构与调用时序图（当前实现）

## 架构总览

```mermaid
graph LR
  subgraph "Frontend"
    FE["FrontendMCPManager"]
  end

  subgraph "Server API (Next.js)"
    Token["GET /api/mcp/secure-proxy/token"]
    Proxy["POST /api/mcp/secure-proxy"]
    BridgeGET["GET /api/mcp/bridge?action=status|health_check"]
    BridgePOST["POST /api/mcp/bridge (call_tool)"]
    CallAPI["/api/mcp/call (简化网关)"]
    ProvidersAPI["GET /api/mcp/providers (简化)"]
  end

  subgraph "Security"
    Zod["Zod 入参校验"]
    HMAC["HMAC 安全令牌 (userId 绑定, 5min)"]
    WL["白名单 / 并发 / 超时 / 敏感过滤"]
    Rate["中间件限流 (IP/路径)"]
  end

  subgraph "Orchestrator & Registry"
    Orchestrator["MCP Orchestrator"]
    Registry["Provider Registry (内存)"]
  end

  subgraph "MCP Client Layer"
    Caller["getSimpleMCPCaller()"]
    Client["SecureMCPClient / MCPClient"]
    SafeImpl["本地安全实现（如 BMI / 营养计算）"]
  end

  subgraph "Providers"
    LocalHealth["local-health-tools"]
    External["外部 MCP Providers"]
  end

  subgraph "MCP Producer (Health App)"
    Server["HealthMCPServer (11 工具)"]
  end

  FE -- "获取令牌" --> Token
  Token -- "返回 token" --> FE
  FE -- "带 token 调用" --> Proxy

  Proxy --> Zod
  Proxy --> HMAC
  Proxy --> WL

  Proxy -- "安全工具直连" --> SafeImpl
  Proxy -- "通过 MCP 客户端" --> Client
  Client --> LocalHealth

  BridgeGET --> Orchestrator
  BridgePOST --> Orchestrator
  Orchestrator --> Registry
  Orchestrator --> Caller
  Caller --> Client
  Client --> External

  CallAPI --> Caller

  ProvidersAPI --> Registry

  Rate --> Proxy
  Rate --> BridgeGET
  Rate --> BridgePOST
  Rate --> CallAPI
```

## 端到端调用时序（前端 → 安全代理 → 编排 → Provider）

```mermaid
sequenceDiagram
  autonumber
  participant FE as FrontendMCPManager
  participant Token as GET /api/mcp/secure-proxy/token
  participant Proxy as POST /api/mcp/secure-proxy
  participant Sec as Zod/HMAC/白名单/并发/超时
  participant Orc as MCP Orchestrator
  participant Reg as Provider Registry
  participant Caller as Simple Caller
  participant Client as MCPClient/SecureMCPClient
  participant Prov as Provider(local-health-tools/外部)

  FE->>Token: 请求一次性 HMAC 令牌
  Token-->>FE: 返回 token(5min 有效)

  FE->>Proxy: 提交 tool+params+token
  Proxy->>Sec: 入参校验 + 令牌校验 + 策略检查

  alt 命中本地安全实现（如 BMI/营养计算）
    Proxy->>Proxy: 安全本地计算（不出网）
    Proxy-->>FE: 返回结果
  else 通过 Orchestrator 调用 Provider
    Proxy->>Orc: call_tool(providerId, tool, params)
    Orc->>Reg: 获取 Provider 配置
    Orc->>Caller: 调用工具
    Caller->>Client: connect()
    Client->>Prov: MCP callTool()
    Prov-->>Client: 工具执行结果
    Client-->>Caller: 结果
    Caller-->>Orc: 结果
    Orc-->>Proxy: 结果
    Proxy-->>FE: 返回结果
  end

  Note over Proxy: 响应敏感过滤 + 大小限制
```

## 说明
- 前端统一通过安全代理调用 MCP，避免直接暴露外部 Provider；令牌采用 HMAC（与 userId 绑定，5 分钟有效）。
- `/api/mcp/bridge` 已接入 Orchestrator（统一 Provider Registry 与客户端调用），`/api/mcp/call` 作为简化网关仍可用。
- Provider Registry 当前为内存实现，后续可持久化并加密敏感字段，支持信任级策略下发。
- 可继续扩展：Redis 限流、Orchestrator 连接池/熔断、结构化日志/指标/trace。


