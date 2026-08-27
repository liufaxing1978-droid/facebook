# XST Meta

兴善堂 Facebook / Meta 智能推广系统。

## P0 Engineering Baseline

P0 建立后续 Facebook / Meta 推广系统所依赖的工程底座，但 **不会执行真实 Meta 广告写操作**。当前基线包括：

- pnpm + Turborepo monorepo
- Next.js 管理端 shell 与 BullMQ worker shell
- TypeScript strict、ESLint、Vitest
- PostgreSQL + Prisma migration
- Redis + BullMQ
- Zod 服务端配置校验
- Pino 结构化日志与 Secret redaction
- Meta domain DTO / parser、mocked `MetaClient` 边界、可复用只读 service contract
- operationId / idempotency 基础、受控状态机与 append-only audit writer
- GitHub Actions exact-head CI gate

## Requirements

- Node.js 22
- pnpm 10.15.0
- PostgreSQL 17
- Redis 7.4

## Bootstrap

1. 复制 `.env.example` 为本地 `.env`，P0 只使用 fake Meta 值，不要把真实 Token 提交到 Git。
2. 启动可访问的 PostgreSQL 与 Redis。
3. 安装锁定依赖并准备数据库：

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

4. 运行验证：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

## Security boundary

- `META_APP_SECRET`、`META_SYSTEM_USER_TOKEN` 与加密密钥只允许进入 server-only 配置。
- `packages/config/src/public.ts` 只暴露公开配置。
- 日志层对 Token / Secret 键做 redaction。
- Meta HTTP 测试全部注入 mocked `fetch`，P0 测试不会访问真实 Graph API。
- CI 在 production build 后扫描浏览器静态 bundle，发现 Meta Secret marker 会失败。

## Documentation

- `docs/architecture/ARCHITECTURE.md` — 模块边界与数据流
- `docs/architecture/SECURITY.md` — Secret、Meta 边界与安全约束
- `docs/runbooks/META_SETUP.md` — P0 本地 Meta 配置规则
- `docs/runbooks/P0_CLOSEOUT.md` — P0 exact-head 验证证据
