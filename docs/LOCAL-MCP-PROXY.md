### LOCAL MCP PROXY 对接规范（8 位验证码 + 两遍验证）

#### 概览
- 目标: 浏览器前端安全直连用户本机的 Local MCP Proxy，获取 stdio 能力。
- 核心: 用户在本地 UI 查看 8 位验证码 C；前端两次请求完成握手，服务端签发短期 sessionToken 绑定 origin，后续调用携带该 token。
- 默认算法: PBKDF2-SHA256（可协商 scrypt）。

---

### 安全前提与强制策略
- 仅监听 127.0.0.1/localhost 随机高位端口（不可对外暴露）。
- 严格校验 Host 为 localhost:<port> 或 127.0.0.1:<port>；拒绝其他域名（防 DNS Rebinding）。
- 强制要求并校验 Origin（不可为空）；握手成功后 token 绑定该 Origin（完全匹配）。
- 校验 Sec-Fetch-Site 非 cross-site；建议校验 User-Agent 与最小化 CORS。
- 限流与超时：握手、调用均需限速与请求/响应大小上限。
- 结构化日志：requestId, origin, route, status, durationMs, bytes, userAgent。

---

### 接口一览
- GET /health（可选）
- POST /handshake/init（第一遍）
- POST /handshake/confirm（第二遍）
- GET /tools（需 Authorization）
- POST /call（需 Authorization）
- 可选：POST /handshake/renew、GET /stream（SSE）

统一错误返回：
```json
{ "success": false, "error": "错误描述", "code": "ERR_CODE", "requestId": "..." }
```

---

### 握手流程（两遍验证）

#### 1) 用户查看验证码
- 本地 UI 显示 8 位码 C（建议 60s 轮换，允许上一个窗口的码容错 1 次）。
- UI 同时展示本次连接的来源（origin）供人工确认。

#### 2) 握手初始化
- 前端生成 clientNonce（16 字节，base64），计算：
  - codeProof = SHA256( code + '|' + origin + '|' + clientNonce )
- 请求
```http
POST /handshake/init
Content-Type: application/json
Origin: https://your-frontend.app

{
  "origin": "https://your-frontend.app",
  "clientNonce": "base64-16B",
  "codeProof": "hex-64"
}
```
- 响应
```json
{
  "handshakeId": "uuid-v4",
  "serverNonce": "base64-16B",
  "expiresIn": 60,
  "kdf": "pbkdf2",
  "kdfParams": { "iterations": 200000, "hash": "SHA-256", "length": 32 }
}
```
- 服务器端：
  - 比对 codeProof == SHA256(code|origin|clientNonce)（“当前有效验证码”集合）。
  - 生成并返回 handshakeId 与 serverNonce；记录状态为 pending，绑定 origin/clientNonce，TTL 60s。
  - 本地 UI 弹出“来自 <origin> 的连接请求”，用户点击“允许”后设为 approved。

注：如需 scrypt，可返回：
```json
"kdf": "scrypt",
"kdfParams": { "N": 32768, "r": 8, "p": 1, "length": 32 }
```

#### 3) 握手确认
- 前端根据 kdf 选择派生密钥：
  - PBKDF2：key = PBKDF2(code, serverNonce, iterations=200000, hash=SHA-256, len=32)
  - scrypt：key = scrypt(code, serverNonce, N=32768, r=8, p=1, len=32)
- 计算确认响应：
  - response = HMAC_SHA256_base64(key, origin + '|' + clientNonce + '|' + handshakeId)
- 请求
```http
POST /handshake/confirm
Content-Type: application/json
Origin: https://your-frontend.app

{
  "handshakeId": "uuid-v4",
  "response": "base64"
}
```
- 响应
```json
{
  "sessionToken": "base64-32B",
  "expiresIn": 600
}
```
- 服务器端：
  - 状态必须为 approved；验证 response 成功后签发 sessionToken，绑定 origin 与权限范围，TTL 10 分钟。
  - handshakeId 单次使用，成功后立即失效。

---

### 鉴权与调用

必须请求头：
- Authorization: LocalMCP <sessionToken>
- Origin: <bound-origin>

GET /tools：返回可用工具清单（已按权限裁剪）
```json
{ "success": true, "tools": [{ "name": "BMI_CALCULATOR", "description": "..." }], "requestId": "..." }
```

POST /call：
```json
{ "tool": "BMI_CALCULATOR", "params": { "weight": 68, "height": 170 } }
```
响应：
```json
{ "success": true, "result": { "bmi": 23.53 }, "requestId": "..." }
```

---

### 失败与风控
- 限流：
  - /handshake/init：同 origin+UA 失败 ≥ 5 次/分钟 → 冻结 10 分钟
  - /handshake/confirm：同 handshakeId 失败 ≥ 3 次 → 作废握手
  - /call：同 token+tool 每分钟 N 次
- 过期与重放：
  - handshakeId 单次使用；serverNonce 一次性；超时作废
  - sessionToken TTL 默认 10 分钟，可提供 /handshake/renew 刷新
- 错误码建议：
  - 400 参数错误；401 未鉴权；403 Forbidden（origin 不匹配/未批准）；409 握手状态错误；429 限流；500 内部错误

---

### 服务器必须的校验（伪代码）

Init：
```ts
assert(host in ['localhost:port','127.0.0.1:port'])
assert(origin && isAllowedOrigin(origin))
assert(validRateLimit(origin, ua))

expected = sha256Hex(code + '|' + origin + '|' + clientNonce)
assert(timingSafeEqual(expected, codeProof))

saveHandshake({ id, origin, clientNonce, serverNonce, state: 'pending', ttl: 60s })
```

Confirm：
```ts
hs = loadHandshake(handshakeId)
assert(hs && hs.state === 'approved' && hs.origin === origin)

if (kdf === 'pbkdf2') key = pbkdf2(code, base64Decode(serverNonce), 200000, 32, 'sha256')
else if (kdf === 'scrypt') key = scrypt(code, base64Decode(serverNonce), N=32768, r=8, p=1, len=32)

expected = hmacSha256Base64(key, origin + '|' + hs.clientNonce + '|' + handshakeId)
assert(timingSafeEqual(expected, response))

token = randomBytes(32)
bindToken(token, { origin, scopes, ttl: 10m })
return { sessionToken: base64(token), expiresIn: 600 }
```

---

### 观测与日志
- 事件：mcp.local.handshake_init / _approve / _confirm / _reject / _rate_limit；mcp.local.tools_list；mcp.local.call
- 字段：requestId, origin, host, route, status, durationMs, bytes, userAgent, tool, errorCode

---

### 与前端实现兼容性
- 前端默认使用 PBKDF2；若返回 `kdf: 'scrypt'`，需在前端启用 scrypt 实现（通过协商字段切换）。
- `Authorization: LocalMCP <sessionToken>` 与 `Origin` 必须存在；未携带直接 401/403。


