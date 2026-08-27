# XST Meta P1 Meta Read-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-shaped, server-only Meta Graph read adapter that can verify a Meta connection and read Ad Accounts, Campaigns, Ad Sets, Ads and Insights without introducing any advertising write operation.

**Architecture:** Extend the P0 `packages/meta` boundary rather than calling Graph API from pages or workers. `GraphMetaReadService` consumes the existing `MetaClient`, parses paginated Graph envelopes into existing P0 domain DTOs, and implements the existing `MetaReadService` interface. CI uses mocked `fetch` only; a real-token smoke check is explicitly operational and server-side, never required for deterministic CI.

**Tech Stack:** TypeScript strict, Zod, Vitest, existing `MetaClient`, PostgreSQL/Prisma, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-08-27-xst-meta-v1-design.md`

## Global Constraints

- P1 is read-only: no `POST`/`DELETE` advertising mutation and no `ads_management` workflow.
- Meta Graph version comes only from `META_GRAPH_VERSION`.
- Meta access tokens remain server-only and must not enter browser bundles, Git, ordinary logs or snapshots.
- All Graph traffic goes through `packages/meta`; application code must not call `graph.facebook.com` directly.
- External Meta payloads are parsed before entering domain logic.
- CI tests use mocked `fetch`; deterministic verification must not depend on a live Meta account.
- Pagination must be bounded and loop-safe.
- Work follows RED -> GREEN -> REFACTOR -> exact-head full verification.
- P1 closes only when lint, typecheck, unit, integration, build and secret-regression checks are green on one exact commit SHA.

---

## File Structure

Create or modify these focused units:

```text
packages/meta/src/
  client.ts                 existing P0 HTTP boundary
  domain.ts                 existing P0 domain DTO/parsers
  services.ts               existing MetaReadService interface
  graph-envelope.ts         Graph collection envelope + pagination cursor parser
  graph-read-service.ts     real read-only MetaReadService implementation
  graph-read-service.test.ts mocked Graph contract tests
  connection.ts             read-only `/me` connection verification helper
  connection.test.ts        mocked connection tests
packages/database/src/
  meta-connections.ts       persist non-secret connection metadata/status
  meta-connections.test.ts  database integration coverage
tests/integration/
  meta-connection.test.ts   persistence lifecycle using PostgreSQL
apps/web/app/api/meta/
  health/route.ts           server-only read-only connection health endpoint
  health/route.test.ts      route-level unit test with injected service

docs/runbooks/
  META_READONLY.md          server-side setup + live smoke instructions
  P1_CLOSEOUT.md            exact-SHA closure evidence
```

### Task 1: Graph collection envelope and bounded pagination

**Files:**
- Create: `packages/meta/src/graph-envelope.ts`
- Create: `packages/meta/src/graph-envelope.test.ts`
- Modify: `packages/meta/src/client.ts`

**Interfaces:**
- Produces `parseGraphCollection<T>(input, itemParser): GraphCollection<T>`.
- Produces `MetaClient.requestUrl<T>(url: URL): Promise<T>` for safe following of Meta-provided `paging.next` URLs.
- Pagination consumers must cap page count at 100 by default and reject a repeated `next` URL.

- [ ] **Step 1: Write failing envelope tests**

```ts
it("parses data and next cursor while ignoring unknown fields", () => {
  const result = parseGraphCollection(
    { data: [{ id: "1", extra: true }], paging: { next: "https://graph.facebook.com/v26.0/x?after=abc" }, extraRoot: 1 },
    (value) => ({ id: String((value as { id: string }).id) })
  );
  expect(result.items).toEqual([{ id: "1" }]);
  expect(result.next?.toString()).toContain("after=abc");
});
```

Also test malformed `data`, non-Graph `paging.next`, and duplicate-next protection helper.

- [ ] **Step 2: Run RED**

Run: `pnpm vitest packages/meta/src/graph-envelope.test.ts --run`
Expected: FAIL because `graph-envelope.ts` does not exist.

- [ ] **Step 3: Implement minimal parser and `requestUrl`**

Only allow `https://graph.facebook.com/` for `requestUrl`; preserve the existing timeout/error mapping path.

- [ ] **Step 4: Run GREEN and typecheck**

Run: `pnpm vitest packages/meta/src/graph-envelope.test.ts --run && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/meta/src/graph-envelope* packages/meta/src/client.ts
git commit -m "feat: add safe meta graph pagination"
```

### Task 2: Read-only connection verification

**Files:**
- Create: `packages/meta/src/connection.ts`
- Create: `packages/meta/src/connection.test.ts`

**Interfaces:**
- Produces `verifyMetaConnection(client: MetaClient): Promise<MetaConnectionIdentity>`.
- `MetaConnectionIdentity = { id: string; name?: string }`.
- Uses `GET /me?fields=id,name` only.

- [ ] **Step 1: Write mocked failing tests**

Test success, invalid/missing id fail-closed, auth error propagation and that method is GET.

- [ ] **Step 2: Confirm RED**

Run: `pnpm vitest packages/meta/src/connection.test.ts --run`
Expected: FAIL because helper is absent.

- [ ] **Step 3: Implement the minimal `/me` verifier**

Validate payload before returning identity. Do not log token or full raw response.

- [ ] **Step 4: Verify**

Run: `pnpm vitest packages/meta/src/connection.test.ts --run && pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/meta/src/connection*
git commit -m "feat: verify meta readonly connection"
```

### Task 3: GraphMetaReadService — Ad Accounts

**Files:**
- Create: `packages/meta/src/graph-read-service.ts`
- Create: `packages/meta/src/graph-read-service.test.ts`

**Interfaces:**
- Produces `GraphMetaReadService implements MetaReadService`.
- Constructor: `new GraphMetaReadService(client: MetaClient, options?: { maxPages?: number })`.
- `listAdAccounts()` calls `/me/adaccounts` with fields `id,name,account_status,currency,timezone_name`.

- [ ] **Step 1: Write failing mocked tests**

Test one page, multiple pages, unknown fields, malformed required id, repeated next URL and max-page overflow.

- [ ] **Step 2: Confirm RED**

Run: `pnpm vitest packages/meta/src/graph-read-service.test.ts --run`
Expected: FAIL because service is absent.

- [ ] **Step 3: Implement only `listAdAccounts()` and shared private paginator**

The paginator must use Task 1 safe URL following and preserve result order.

- [ ] **Step 4: Verify service satisfies `MetaReadService` structurally**

Temporarily implement unbuilt methods as private-not-present is not allowed; create public methods that throw `META_API_ERROR` only if required by TypeScript, then remove those throws task-by-task as methods become real. Contract tests must target only completed methods at each step.

- [ ] **Step 5: Run GREEN and commit**

```bash
pnpm vitest packages/meta/src/graph-read-service.test.ts --run
pnpm typecheck
git add packages/meta/src/graph-read-service*
git commit -m "feat: read meta ad accounts"
```

### Task 4: Campaign, Ad Set and Ad hierarchy reads

**Files:**
- Modify: `packages/meta/src/graph-read-service.ts`
- Modify: `packages/meta/src/graph-read-service.test.ts`

**Interfaces:**
- `listCampaigns(adAccountId)` -> `/{adAccountId}/campaigns?fields=id,name,status,effective_status,objective`.
- `listAdSets(campaignId)` -> `/{campaignId}/adsets?fields=id,name,status,effective_status,campaign_id`.
- `listAds(adSetId)` -> `/{adSetId}/ads?fields=id,name,status,effective_status,adset_id`.

- [ ] **Step 1: Add failing tests for each hierarchy level**

For every method test exact path/fields, pagination, parser failure on missing id, and empty data.

- [ ] **Step 2: Run RED**

Run: `pnpm vitest packages/meta/src/graph-read-service.test.ts --run`
Expected: new hierarchy assertions FAIL.

- [ ] **Step 3: Implement the three methods using the same paginator**

Do not duplicate pagination logic. Parent ids are URL path values only; reject blank ids before request.

- [ ] **Step 4: Run the existing shared MetaReadService contract against `GraphMetaReadService` with mocked HTTP fixtures**

The same behavioral expectations used by `FakeMetaService` must hold for real adapter DTOs.

- [ ] **Step 5: Verify and commit**

```bash
pnpm vitest packages/meta/src/graph-read-service.test.ts packages/meta/src/contract.test.ts --run
pnpm lint
pnpm typecheck
git add packages/meta/src/graph-read-service*
git commit -m "feat: read meta campaign hierarchy"
```

### Task 5: Insights read implementation

**Files:**
- Modify: `packages/meta/src/graph-read-service.ts`
- Modify: `packages/meta/src/graph-read-service.test.ts`
- Modify if necessary: `packages/meta/src/domain.ts`

**Interfaces:**
- `readInsights(scope, range)` uses `/{scope.id}/insights`.
- Query fields: `date_start,date_stop,spend,impressions,reach,clicks,ctr,cpc,cpm`.
- Query includes `level`, `time_range` JSON, and `limit`.
- Existing domain conversion keeps numeric metrics as internal numbers.

- [ ] **Step 1: Add failing tests for account/campaign/adset/ad scope and date range serialization**

Test malformed numeric strings fail closed and empty metric values follow the existing domain parser policy.

- [ ] **Step 2: Confirm RED**

Run: `pnpm vitest packages/meta/src/graph-read-service.test.ts --run`
Expected: insights assertions FAIL.

- [ ] **Step 3: Implement minimal insights request + pagination**

Validate `YYYY-MM-DD` format before calling Meta. Do not infer dates inside the adapter.

- [ ] **Step 4: Verify**

Run: `pnpm vitest packages/meta/src/graph-read-service.test.ts --run && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/meta/src/graph-read-service* packages/meta/src/domain.ts
git commit -m "feat: read meta insights"
```

### Task 6: Persist non-secret Meta connection health

**Files:**
- Create: `packages/database/src/meta-connections.ts`
- Create: `tests/integration/meta-connection.test.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_p1_meta_connection_health/migration.sql`

**Interfaces:**
- Produces `recordMetaConnectionHealth(input)`.
- Persist only non-secret metadata: provider identity id/name, status, lastVerifiedAt, lastErrorCode, updatedAt.
- Never persist the access token in this helper.

- [ ] **Step 1: Write failing PostgreSQL integration tests**

Verify upsert by connection id, success clears prior error, failure records stable error code, and no token-shaped field exists in input/output.

- [ ] **Step 2: Confirm RED**

Run: `pnpm test:integration -- meta-connection.test.ts`
Expected: FAIL because persistence helper/schema fields are absent.

- [ ] **Step 3: Add migration and helper**

Keep P0 `MetaConnection` compatibility; add only fields required by this task.

- [ ] **Step 4: Apply migration and verify**

Run: `pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm test:integration -- meta-connection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma packages/database/src/meta-connections.ts tests/integration/meta-connection.test.ts
git commit -m "feat: persist meta connection health"
```

### Task 7: Server-only Meta health route

**Files:**
- Create: `apps/web/app/api/meta/health/route.ts`
- Create: `apps/web/app/api/meta/health/route.test.ts`
- Modify: `apps/web/package.json` only if workspace dependencies are required

**Interfaces:**
- `GET /api/meta/health` returns sanitized JSON only: `{ status: "connected", identity: { id, name? } }` or `{ status: "error", code }`.
- The route creates server-only config/MetaClient dependencies through a small factory; tests inject a fake verifier.
- No token, raw Meta payload, trace id or stack appears in the response.

- [ ] **Step 1: Write failing route tests**

Test connected response and auth/permission failure sanitization.

- [ ] **Step 2: Confirm RED**

Run: `pnpm vitest apps/web/app/api/meta/health/route.test.ts --run`
Expected: FAIL because route is absent.

- [ ] **Step 3: Implement route and server-only dependency factory**

Use `parseServerEnv(process.env)` only on the server path. Never export the client factory from a client component.

- [ ] **Step 4: Run security and build checks**

Run: `pnpm vitest apps/web/app/api/meta/health/route.test.ts --run && pnpm build`
Expected: PASS; existing bundle secret regression must remain green.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: expose sanitized meta health endpoint"
```

### Task 8: P1 documentation, live-read runbook and closeout candidate

**Files:**
- Create: `docs/runbooks/META_READONLY.md`
- Create: `docs/runbooks/P1_CLOSEOUT.md`
- Modify: `README.md`
- Modify: `.github/workflows/verify.yml` only if new migration/test discovery requires it

**Interfaces:**
- Documents how to supply real credentials through deployment/server environment only.
- Documents the optional live smoke sequence: `/me` -> `/me/adaccounts` -> one account campaigns -> one campaign adsets -> one adset ads -> one insights request.
- Does not place real credentials in commands or docs.

- [ ] **Step 1: Document setup and permission boundary**

State that deterministic CI uses mocks and that live smoke requires a separately provisioned server secret with read permissions. Do not claim live connectivity until a live smoke has actually been executed.

- [ ] **Step 2: Run exact-head full verification**

Run via GitHub Actions on one commit SHA:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

Plus the existing browser Meta Secret regression scan.

- [ ] **Step 3: Record candidate SHA/run in `P1_CLOSEOUT.md`**

Use the same evidence-commit discipline as P0: candidate exact-head must be green; then the evidence commit itself must rerun the complete gate.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/runbooks .github/workflows/verify.yml
git commit -m "docs: prepare p1 meta readonly closeout"
```

- [ ] **Step 5: Final exact-head evidence gate**

Only after the evidence commit itself is fully green may P1 be marked `CLOSED (code/read-adapter complete)`. If no real Meta secret has been provisioned, explicitly record live smoke as `NOT EXECUTED` rather than presenting mocked CI as proof of external account connectivity.

## Self-Review

- Spec coverage: P1 covers server-only connection verification, Ad Account/Campaign/Ad Set/Ad/Insights reads, persistence of non-secret connection health, and an operational live-read runbook. It intentionally excludes all Meta writes, Page/Instagram publishing, CAPI and AI optimization.
- Placeholder scan: no TBD/TODO/"implement later" placeholders are used; each task has exact files, interfaces, tests and commands.
- Type consistency: `GraphMetaReadService` implements the existing P0 `MetaReadService`; `MetaClient` remains the only HTTP boundary; connection persistence never accepts access tokens.
