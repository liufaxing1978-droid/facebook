# Meta Read-Only Runbook

This runbook covers the P1 server-only Meta read path. P1 can verify the configured Meta identity, list Ad Accounts, Campaigns, Ad Sets and Ads, and read Insights. It intentionally does not create, edit, pause, delete or spend against Meta advertising objects.

## Security boundary

Real Meta credentials must be provisioned only through the deployment/server secret environment. Never place a real token, app secret or encryption key in Git, screenshots, issue text, shell history, client-side environment variables, browser bundles or documentation examples.

The server-only configuration consumes these variable names:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_SYSTEM_USER_TOKEN`
- `META_GRAPH_VERSION`

Other required server variables remain governed by `packages/config/src/server.ts`. Values must be injected by the deployment platform or server secret manager. The browser must never receive `META_APP_SECRET` or `META_SYSTEM_USER_TOKEN`.

P1 requires a Meta identity/token that is authorized for the intended read-only assets. Confirm the current Meta permission requirements for the app and assets before a live smoke. Do not add advertising write permissions merely to make the P1 smoke pass.

## Deterministic CI boundary

GitHub Actions is deterministic and does not require a real Meta credential. Adapter tests use mocked HTTP fixtures and injected verifiers. CI proves local contracts, parsing, pagination, sanitization, persistence, build safety and Secret regression behavior; it does **not** prove that a real Meta Business or Ad Account is reachable.

## Health endpoint

`GET /api/meta/health` is server-only at the dependency boundary and returns sanitized JSON only.

Connected shape:

```json
{
  "status": "connected",
  "identity": {
    "id": "provider-identity-id",
    "name": "optional provider name"
  }
}
```

Error shape:

```json
{
  "status": "error",
  "code": "META_AUTH_ERROR"
}
```

The response must not contain a token, raw Meta payload, provider trace id, stack trace or raw provider error message.

## Optional live smoke sequence

Run this only from a correctly provisioned server environment. Do not paste credentials into commands. Use the application/server configuration already injected into the process.

1. Verify identity with the same server path used by `/api/meta/health` (`/me`, fields `id,name`).
2. Read `/me/adaccounts` and select one accessible Ad Account.
3. Read Campaigns for that account.
4. Select one Campaign and read its Ad Sets.
5. Select one Ad Set and read its Ads.
6. Run one Insights read for a known scope and explicit `YYYY-MM-DD` range.
7. Confirm no write request was emitted and no Secret appeared in application logs or browser assets.

Expected failure handling is fail-closed with stable internal codes such as `META_AUTH_ERROR`, `META_PERMISSION_ERROR`, `META_RATE_LIMIT` or `META_API_ERROR`. Raw Meta error bodies stay server-side.

## Live-smoke evidence rule

A live smoke is external evidence and must be recorded separately with date, environment, tested asset scope and sanitized result. Never store the token or raw credential material with that evidence. If no live secret has been provisioned, record the smoke as `NOT EXECUTED`; mocked CI must never be described as proof of real Meta connectivity.
