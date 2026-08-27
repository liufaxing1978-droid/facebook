# XST Meta Architecture — P0

## Purpose

P0 是工程与安全基线，不是广告投放功能阶段。它为后续真实 Meta 只读同步、策略、审批、执行与 AI 功能提供稳定边界，同时保持 P0 无真实广告写操作。

## Repository boundaries

| Boundary | Responsibility |
| --- | --- |
| `apps/web` | Next.js 管理端 shell；不得直接持有 Meta Secret |
| `apps/worker` | BullMQ worker / queue 基础与 Redis health |
| `packages/config` | Zod server env validation 与 public config 白名单 |
| `packages/logger` | Pino structured logging 与 secret redaction |
| `packages/shared` | 稳定错误码等共享类型 |
| `packages/database` | Prisma client、health、operations、audit persistence |
| `packages/meta` | 唯一 Meta API/domain boundary；client、parser、service contracts、fake implementation |
| `prisma` | 数据模型与迁移 |
| `tests/integration` | PostgreSQL / Redis / operation contract 验证 |
| `tests/fixtures` | 确定性 fake Meta 数据 |

## Durable state

PostgreSQL / Prisma 持久化 `User`、`Setting`、`MetaConnection`、`SyncRun`、`MetaApiOperation` 与 `AuditLog`。`MetaApiOperation.operationId` 和 `idempotencyKey` 是唯一约束，作为后续敏感 Meta 操作防重复执行的基础。

Operation 状态机：

```text
REQUESTED -> SUBMITTED -> VERIFIED
     |            |
     +----------> FAILED
                  ^
REQUESTED --------+
```

`VERIFIED` 与 `FAILED` 为终态。状态更新使用当前状态作为条件更新的一部分，避免并发下静默覆盖。

## Async work

Redis / BullMQ 是异步执行边界。敏感 future jobs 必须由调用方提供 `operationId`，队列 job ID 与 operation ID 对齐用于去重。P0 只建立 queue contract，不执行真实 Meta mutation。

## Meta boundary

所有 Meta 相关调用必须经过 `packages/meta`：

```text
business/application layer
          |
          v
    MetaReadService
       /       \
FakeMetaService  future Graph implementation
                      |
                  MetaClient
                      |
               Meta Graph API
```

P0 的 contract suite 只运行 `FakeMetaService` 与 mocked `fetch`。真实 Graph read implementation 留给后续阶段；业务层接口无需因此改变。

## Verification

P0 正式 CI 在同一 commit SHA 上运行：frozen dependency install、Prisma generate/migrate、lint、typecheck、unit、integration、production build 与 browser-secret regression scan。任何一项失败都不能关闭 P0。
