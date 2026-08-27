# P0 Engineering Baseline Closeout

## Status

**CANDIDATE — NOT CLOSED YET**

本文件随 Task 10 closeout candidate 提交。P0 只有在该 candidate 的 exact commit SHA 上，正式 `verify` workflow 全门通过后，才可以转为 CLOSED。

## Required gate

同一个 SHA 必须全部通过：

- `pnpm install --frozen-lockfile`
- Prisma client generation
- Prisma migration deploy against PostgreSQL service
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm build`
- browser static bundle Meta Secret regression scan

## Security assertions

- `.env.example` 只含 fake Meta values。
- public config 不导出 Meta Secret / Token。
- logger redaction test 覆盖 Meta Token 泄漏。
- Meta HTTP tests 使用 mocked `fetch`，不访问真实 Graph API。
- P0 不执行真实 Meta 广告写操作。

## Execution environment note

当前执行会话没有可用的 npm/GitHub 网络用于本地依赖安装，因此计划中的“本地同 SHA 验证”采用 GitHub Actions hosted runner 作为可复现执行环境。所有关闭证据仍要求来自同一个 exact commit SHA；不会拼接不同 SHA 的测试结果。

## Evidence

待 candidate exact-head CI 完成后填写 verified SHA、workflow run 与逐门结果。由于 Git commit 不能在自身内容中稳定自引用自己的 SHA，最终 evidence 文档记录已验证的 candidate SHA；承载 evidence 文档的后续 commit 也必须再次跑完整 exact-head gate，才能宣告 P0 关闭。
