# XST Meta P0 Engineering Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production-grade engineering baseline that all later XST Meta phases depend on, without performing any real Meta advertising write operations.

**Architecture:** Use a pnpm/Turborepo monorepo with `apps/web`, `apps/worker` and focused shared packages. PostgreSQL/Prisma owns durable state, Redis/BullMQ owns asynchronous work, and `packages/meta` is the only allowed boundary for Meta APIs. P0 uses fake/mock Meta implementations and contract tests so P2 can add real read-only Graph API implementations without changing business-layer interfaces.

**Tech Stack:** Next.js, TypeScript, pnpm, Turborepo, PostgreSQL, Prisma, Redis, BullMQ, Zod, Pino, Vitest, Docker Compose, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-08-27-xst-meta-v1-design.md`

## Global Constraints

- TypeScript `strict` must be enabled.
- Production code must not use untyped `any` as an escape hatch.
- External data must be validated before entering domain logic.
- Meta Graph version comes only from `META_GRAPH_VERSION`.
- Meta tokens and secrets are server-only and must never enter browser bundles, Git, normal logs or test snapshots.
- Application code must consume `packages/meta`; direct scattered calls to `graph.facebook.com` are prohibited.
- Database changes use Prisma migrations.
- Tests must never make accidental real Meta requests.
- Work follows RED -> GREEN -> REFACTOR -> full verification.
- P0 closes only when lint, typecheck, unit tests, integration tests and build are green on the same exact commit SHA.

---

## File Structure

Create the following boundaries:

```text
apps/web/                 Next.js administration shell
apps/worker/              BullMQ worker and health entry
packages/config/          validated environment configuration
packages/logger/          Pino logger and secret redaction
packages/shared/          shared error/result/id types
packages/database/        Prisma client and persistence helpers
packages/meta/            Meta contracts, client boundary and fake implementation
packages/analytics/       reserved analytics domain package shell
packages/ai/              reserved AI adapter package shell
prisma/                   schema and migrations
tests/integration/        Postgres/Redis integration tests
tests/fixtures/           deterministic fake fixtures
.github/workflows/        CI gates
docs/architecture/        architecture notes
docs/runbooks/            local/dev operational runbooks
```

### Task 1: Monorepo and runnable shells

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/app/page.tsx`
- Create: `apps/worker/package.json`
- Create: `apps/worker/src/index.ts`
- Test: `apps/worker/src/index.test.ts`

**Interfaces:**
- Produces workspace scripts `lint`, `typecheck`, `test:unit`, `test:integration`, `build`.
- Produces a minimal web shell and worker health entry used by later tasks.

- [ ] **Step 1: Write a failing worker health test**

```ts
import { describe, expect, it } from "vitest";
import { workerHealth } from "./index";

describe("workerHealth", () => {
  it("returns ok", () => {
    expect(workerHealth()).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm vitest apps/worker/src/index.test.ts --run`
Expected: FAIL because `workerHealth` does not exist.

- [ ] **Step 3: Implement the minimal worker entry**

```ts
export function workerHealth() {
  return { status: "ok" as const };
}
```

- [ ] **Step 4: Configure workspace, TypeScript, ESLint, Vitest and the minimal Next.js page**

The root scripts must expose exactly:

```json
{
  "scripts": {
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test:unit": "vitest run --exclude tests/integration/**",
    "test:integration": "vitest run tests/integration",
    "build": "turbo run build"
  }
}
```

- [ ] **Step 5: Verify the baseline**

Run: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo baseline"
```

### Task 2: Validated server configuration

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/src/server.ts`
- Create: `packages/config/src/public.ts`
- Create: `packages/config/src/server.test.ts`
- Create: `.env.example`

**Interfaces:**
- Produces `parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv`.
- Produces a public configuration module that does not expose secrets.

- [ ] **Step 1: Write failing configuration tests**

```ts
import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./server";

describe("parseServerEnv", () => {
  it("fails when META_GRAPH_VERSION is missing", () => {
    expect(() => parseServerEnv({ DATABASE_URL: "postgresql://x", REDIS_URL: "redis://x" })).toThrow();
  });

  it("accepts a complete fake server environment", () => {
    const env = parseServerEnv({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/xst",
      REDIS_URL: "redis://localhost:6379",
      APP_URL: "http://localhost:3000",
      LOG_LEVEL: "info",
      META_APP_ID: "fake-app",
      META_APP_SECRET: "fake-secret",
      META_SYSTEM_USER_TOKEN: "fake-token",
      META_GRAPH_VERSION: "v26.0",
      TOKEN_ENCRYPTION_KEY: "01234567890123456789012345678901"
    });
    expect(env.META_GRAPH_VERSION).toBe("v26.0");
  });
});
```

- [ ] **Step 2: Confirm RED**

Run: `pnpm vitest packages/config/src/server.test.ts --run`
Expected: FAIL because parser is absent.

- [ ] **Step 3: Implement Zod-based `parseServerEnv`**

Required keys: `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `LOG_LEVEL`, `META_APP_ID`, `META_APP_SECRET`, `META_SYSTEM_USER_TOKEN`, `META_GRAPH_VERSION`, `TOKEN_ENCRYPTION_KEY`.

- [ ] **Step 4: Ensure `public.ts` exports no Meta secret/token fields**

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm vitest packages/config/src/server.test.ts --run && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/config .env.example
git commit -m "feat: add validated server configuration"
```

### Task 3: Structured logger and stable errors

**Files:**
- Create: `packages/shared/src/errors.ts`
- Create: `packages/logger/src/index.ts`
- Create: `packages/logger/src/index.test.ts`

**Interfaces:**
- Produces `AppError` with stable codes.
- Produces `createLogger()` with secret redaction.

- [ ] **Step 1: Write a failing redaction test**

The test must log an object containing `META_SYSTEM_USER_TOKEN` and assert serialized output does not contain the token value.

- [ ] **Step 2: Confirm RED**

Run: `pnpm vitest packages/logger/src/index.test.ts --run`
Expected: FAIL.

- [ ] **Step 3: Implement Pino logger redaction**

At minimum redact keys named `token`, `access_token`, `META_SYSTEM_USER_TOKEN`, `META_APP_SECRET` and nested equivalents.

- [ ] **Step 4: Implement stable `AppError` codes**

Initial codes: `CONFIG_ERROR`, `DATABASE_ERROR`, `QUEUE_ERROR`, `META_AUTH_ERROR`, `META_PERMISSION_ERROR`, `META_RATE_LIMIT`, `META_API_ERROR`, `VALIDATION_ERROR`.

- [ ] **Step 5: Verify**

Run: `pnpm vitest packages/logger/src/index.test.ts --run && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared packages/logger
git commit -m "feat: add structured logger and app errors"
```

### Task 4: PostgreSQL and Prisma persistence baseline

**Files:**
- Create: `prisma/schema.prisma`
- Create: `packages/database/src/client.ts`
- Create: `packages/database/src/health.ts`
- Create: `tests/integration/database.test.ts`
- Create migration under: `prisma/migrations/...`

**Interfaces:**
- Produces Prisma models `User`, `Setting`, `MetaConnection`, `SyncRun`, `MetaApiOperation`, `AuditLog`.
- Produces `databaseHealth(): Promise<{status:"ok"}>`.

- [ ] **Step 1: Write a failing integration test**

Test that the database health check executes and that a `MetaApiOperation` with a unique `operationId` can be inserted and read.

- [ ] **Step 2: Start local Postgres via Docker Compose and confirm RED**

Run: `docker compose up -d postgres && pnpm test:integration -- database.test.ts`
Expected: FAIL because schema/client do not exist.

- [ ] **Step 3: Define the minimal schema and generate migration**

`MetaApiOperation.operationId` and `idempotencyKey` must be unique enough to prevent accidental duplicate operations.

- [ ] **Step 4: Implement health check and persistence helper**

- [ ] **Step 5: Run migration and integration test**

Run: `pnpm prisma migrate deploy && pnpm test:integration -- database.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma packages/database tests/integration/database.test.ts docker-compose.yml
git commit -m "feat: add prisma persistence baseline"
```

### Task 5: Redis and BullMQ worker baseline

**Files:**
- Create: `apps/worker/src/queue.ts`
- Create: `apps/worker/src/queue.test.ts`
- Create: `tests/integration/redis.test.ts`

**Interfaces:**
- Produces `createQueue(name)` and `redisHealth()`.
- Establishes default retry/backoff policy for future sync/CAPI/AI jobs.

- [ ] **Step 1: Write failing unit and integration tests**

Assert queue defaults include bounded retries and exponential backoff; assert Redis ping succeeds in integration environment.

- [ ] **Step 2: Confirm RED**

Run: `pnpm test:unit && pnpm test:integration -- redis.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement queue factory and Redis health**

- [ ] **Step 4: Verify no job runs without a caller-supplied `operationId` in payload for sensitive future jobs**

- [ ] **Step 5: Run tests**

Run: `pnpm test:unit && pnpm test:integration -- redis.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/worker tests/integration/redis.test.ts
git commit -m "feat: add redis worker baseline"
```

### Task 6: Meta domain types and parsers

**Files:**
- Create: `packages/meta/src/domain.ts`
- Create: `packages/meta/src/parsers.ts`
- Create: `packages/meta/src/parsers.test.ts`

**Interfaces:**
- Produces branded/string ID types and minimal read DTOs for AdAccount, Campaign, AdSet, Ad and InsightRow.
- Produces parsers that ignore unknown forward-compatible fields rather than failing solely because Meta adds fields.

- [ ] **Step 1: Write failing parser tests using fixtures with extra unknown fields**

- [ ] **Step 2: Confirm RED**

- [ ] **Step 3: Implement Zod schemas and internal DTO mapping**

- [ ] **Step 4: Verify malformed required IDs fail closed while unknown fields are tolerated**

- [ ] **Step 5: Run tests and commit**

```bash
git add packages/meta
git commit -m "feat: define meta domain contracts"
```

### Task 7: Meta client boundary and error mapping

**Files:**
- Create: `packages/meta/src/client.ts`
- Create: `packages/meta/src/errors.ts`
- Create: `packages/meta/src/client.test.ts`

**Interfaces:**
- Produces `MetaClient.request<T>(path, options)`.
- Maps transport/API failures to the stable Meta error codes.

- [ ] **Step 1: Write mocked-HTTP failing tests**

Cover successful versioned URL creation, timeout, authentication error, permission error, rate limit and unknown API error.

- [ ] **Step 2: Confirm RED**

- [ ] **Step 3: Implement minimal client**

The URL must be formed from the configured graph version; do not hardcode API versions in service files.

- [ ] **Step 4: Ensure tests use mocked fetch/HTTP and cannot reach real Meta**

- [ ] **Step 5: Verify and commit**

```bash
git add packages/meta
git commit -m "feat: add meta client error boundary"
```

### Task 8: Read-only Meta service contracts and fake implementation

**Files:**
- Create: `packages/meta/src/services.ts`
- Create: `packages/meta/src/fake.ts`
- Create: `packages/meta/src/contract.test.ts`
- Create: `tests/fixtures/meta.ts`

**Interfaces:**
- `listAdAccounts(): Promise<AdAccount[]>`
- `listCampaigns(adAccountId): Promise<Campaign[]>`
- `listAdSets(campaignId): Promise<AdSet[]>`
- `listAds(adSetId): Promise<Ad[]>`
- `readInsights(scope, range): Promise<InsightRow[]>`

- [ ] **Step 1: Write a shared contract suite against the fake implementation**

- [ ] **Step 2: Confirm RED**

- [ ] **Step 3: Implement deterministic fake services**

- [ ] **Step 4: Verify the contract suite can be reused by P2's real Graph implementation**

- [ ] **Step 5: Commit**

```bash
git add packages/meta tests/fixtures/meta.ts
git commit -m "test: add meta service contract suite"
```

### Task 9: Audited operation foundation

**Files:**
- Create: `packages/database/src/operations.ts`
- Create: `packages/database/src/audit.ts`
- Create: `tests/integration/operations.test.ts`

**Interfaces:**
- Produces operation states `REQUESTED`, `SUBMITTED`, `VERIFIED`, `FAILED`.
- Produces APIs to create an operation, transition it safely and append an immutable audit entry.

- [ ] **Step 1: Write failing integration tests for duplicate `operationId` and invalid state transition**

- [ ] **Step 2: Confirm RED**

- [ ] **Step 3: Implement operation persistence and transition validation**

- [ ] **Step 4: Implement audit writer that records actor/source/entity/before/after/result metadata**

- [ ] **Step 5: Run integration tests and commit**

```bash
git add packages/database tests/integration/operations.test.ts
git commit -m "feat: add audited operation foundation"
```

### Task 10: CI, documentation and P0 closeout

**Files:**
- Create: `.github/workflows/verify.yml`
- Modify: `README.md`
- Create: `docs/architecture/ARCHITECTURE.md`
- Create: `docs/architecture/SECURITY.md`
- Create: `docs/runbooks/META_SETUP.md`
- Create: `docs/runbooks/P0_CLOSEOUT.md`

**Interfaces:**
- Produces the exact CI gate used to close P0.

- [ ] **Step 1: Add CI with PostgreSQL and Redis services**

The workflow must run:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

- [ ] **Step 2: Document local bootstrap and fake-secret policy**

- [ ] **Step 3: Run the same verification locally on one commit**

Expected: every command PASS.

- [ ] **Step 4: Push and obtain CI evidence for the exact same commit SHA**

Do not close P0 using tests from different SHAs.

- [ ] **Step 5: Perform security regression check**

Search the repository/build outputs for the fake token marker and verify server-only Meta secrets are not exported to browser code or logs.

- [ ] **Step 6: Write `P0_CLOSEOUT.md` with exact SHA and gate results**

- [ ] **Step 7: Commit**

```bash
git add .github README.md docs
git commit -m "ci: enforce p0 verification gates"
```

## P0 Definition of Done

- Clean clone follows README successfully.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm test:unit` passes.
- `pnpm test:integration` passes.
- `pnpm build` passes.
- PostgreSQL migrations run from zero.
- Redis and worker health checks pass.
- Meta adapter contract tests pass.
- Tests cannot accidentally call real Meta.
- Meta secrets are absent from browser bundles, repository content and normal logs.
- CI is green on the exact P0 closing commit SHA.
- A P0 closeout document records the evidence.

## Next Phase

After P0 closes, P1/P2 may implement the first real Meta path as **read-only only**: Business / Ad Account / Campaign / Ad Set / Ad / Insights. Real advertising write operations remain out of scope until read authorization, pagination, rate limits, error mapping and synchronization are proven stable.
