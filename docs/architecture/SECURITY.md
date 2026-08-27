# XST Meta Security Baseline — P0

## Secret ownership

以下值均为 server-only：

- `META_APP_SECRET`
- `META_SYSTEM_USER_TOKEN`
- `TOKEN_ENCRYPTION_KEY`
- 数据库或 Redis 生产凭证

它们不得进入浏览器 bundle、Git 中的真实配置、普通日志或测试 snapshot。`.env.example` 中只允许 fake / placeholder 值。

`packages/config/src/server.ts` 是 Secret 校验入口；`packages/config/src/public.ts` 使用显式白名单，目前只暴露 `appUrl`。

## Logging

Pino logger 至少 redacts：`token`、`access_token`、`META_SYSTEM_USER_TOKEN`、`META_APP_SECRET` 及嵌套等价字段。测试使用确定性假 Token 验证序列化日志不包含 Secret 值。

## Meta network safety

- Graph API version 从 `META_GRAPH_VERSION` 注入，不在 service 文件散落硬编码版本。
- `MetaClient` 是 HTTP boundary，统一 timeout 与 auth / permission / rate-limit / unknown API error mapping。
- Meta client 测试注入 mocked `fetch`，不依赖真实网络。
- P0 不包含真实广告 mutation workflow。

## Browser boundary

Web 客户端不得 import server env 或 Meta token provider。正式 CI 在 Next.js production build 后扫描 `apps/web/.next/static`，以下 marker 任一出现即失败：

- 测试 Token marker
- `.env.example` fake Meta Secret / Token marker
- `META_SYSTEM_USER_TOKEN`
- `META_APP_SECRET`

这项扫描补充而不替代 code review 与 server/client module boundary。

## Persistence and audit

- operationId 与 idempotencyKey 使用数据库唯一约束防止重复持久化。
- operation transition 按允许状态机执行，并使用条件更新降低并发覆盖风险。
- AuditLog 使用 append-only writer；已有 audit facts 不在 writer 中被 update。

## Production readiness boundary

P0 通过不代表允许真实 Meta 写操作。接入真实凭证、真实 Graph read/write、权限审批、密钥存储/轮换、部署平台 Secret manager、生产监控与 incident runbook 必须在对应后续阶段单独验收。
