# Meta Setup Runbook — P0

## Scope

本 runbook 只用于 P0 工程验证。**不要在 P0 开发或 CI 中放入真实 Meta App Secret、System User Token 或广告账户凭证。**

## Local environment

复制示例：

```bash
cp .env.example .env
```

P0 需要的 server env keys：

```text
NODE_ENV
DATABASE_URL
REDIS_URL
APP_URL
LOG_LEVEL
META_APP_ID
META_APP_SECRET
META_SYSTEM_USER_TOKEN
META_GRAPH_VERSION
TOKEN_ENCRYPTION_KEY
```

`.env.example` 的 Meta 值全部是 fake 值，只用于 parser / boundary 验证。`META_GRAPH_VERSION` 通过环境注入；不要在 service 层另写版本号。

## Database and Redis

准备 PostgreSQL 17 与 Redis 7.4，然后运行：

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

当前仓库不依赖 committed Docker Compose；GitHub Actions 使用 service containers 提供 PostgreSQL 与 Redis。开发机可使用任意等价本地实例，只要 `DATABASE_URL` 与 `REDIS_URL` 可访问。

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

Meta client 单元测试使用注入的 mocked `fetch`。如果新增测试需要真实 Meta Token 或真实 Graph endpoint 才能通过，该测试不属于 P0 baseline，应先重新设计边界。

## Real credentials later

后续阶段接入真实 Meta 时：

1. 真实 Secret 只能进入部署环境的 Secret manager / encrypted server storage。
2. 不要复制真实 Token 到 `.env.example`、issue、PR、日志或截图。
3. 在启用真实网络实现前，先复用 `MetaReadService` contract suite 验证行为兼容。
4. 广告写操作必须建立在 operationId、idempotency、audit、审批与 verification 机制之上，不得绕过 `packages/meta`。
