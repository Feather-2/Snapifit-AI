# package.json 依赖更新说明

## 需要添加的依赖

```bash
npm install @upstash/redis
```

或更新 package.json:

```json
{
  "dependencies": {
    "@upstash/redis": "^1.34.0"
  }
}
```

然后运行:

```bash
npm install
```

## 说明

- `@upstash/redis`: Redis 客户端，用于生产环境的速率限制
- 如果使用 Vercel KV，则不需要安装额外依赖（Vercel 已包含）

## 验证安装

```bash
npm list @upstash/redis
```

应该看到类似输出:

```
snapifit-ai-community-edition@0.1.1
└── @upstash/redis@1.34.0
```
