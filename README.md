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

## P1 Meta Read-Only

P1 增加 server-only Meta 只读适配层，仍然 **不包含任何广告写入或自动花费能力**。当前只读能力包括：

- `/me` 连接身份校验
- Ad Account 列表读取
- Campaign / Ad Set / Ad 层级读取
- Account / Campaign / Ad Set / Ad Insights 读取
- 分页、日期与响应 payload fail-closed 校验
- 非 Secret 的 Meta 连接健康状态持久化
- `GET /api/meta/health` 安全健康检查接口
- 浏览器 bundle Meta Secret 回归扫描

真实 Meta 凭据只能通过部署/服务器 Secret 环境提供；确定性 CI 使用 mocked HTTP fixtures，不把 mock 结果当作真实 Meta 连通性证明。完整操作边界与可选 live smoke 顺序见 `docs/runbooks/META_READONLY.md`。

## Requirements

- Node.js 22
- pnpm 10.15.0
- PostgreSQL 17
- Redis 7.4

## Bootstrap

1. 复制 `.env.example` 为本地 `.env`。不要把真实 Token 提交到 Git；真实 Meta 凭据只允许通过部署/服务器 Secret 环境提供。
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
- Meta HTTP 测试全部注入 mocked `fetch`，确定性 CI 不访问真实 Graph API。
- CI 在 production build 后扫描浏览器静态 bundle，发现 Meta Secret marker 会失败。
- P1 的 `/api/meta/health` 仅返回 sanitized identity 或稳定错误码，不返回 raw Meta payload、trace id、stack 或 Secret。

## Documentation

- `docs/architecture/ARCHITECTURE.md` — 模块边界与数据流
- `docs/architecture/SECURITY.md` — Secret、Meta 边界与安全约束
- `docs/runbooks/META_SETUP.md` — P0 本地 Meta 配置规则
- `docs/runbooks/P0_CLOSEOUT.md` — P0 exact-head 验证证据
- `docs/runbooks/META_READONLY.md` — P1 只读配置、安全边界与可选 live smoke
- `docs/runbooks/P1_CLOSEOUT.md` — P1 exact-head closeout 证据与 live-smoke 状态
