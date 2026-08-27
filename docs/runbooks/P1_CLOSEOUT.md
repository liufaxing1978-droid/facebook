# P1 Meta Read-Only Closeout

## Scope

P1 completes the code/read-adapter milestone for server-only Meta read access. The delivered scope is limited to connection verification, Ad Account/Campaign/Ad Set/Ad hierarchy reads, Insights reads, non-secret connection-health persistence and a sanitized health endpoint.

P1 explicitly excludes Meta advertising writes, Page/Instagram publishing, Conversions API, automated budget changes, AI optimization execution and any autonomous spend behavior.

## Candidate exact-head evidence

Candidate commit: `10ca80fcfe13f8655d2cca30b9f4da73f11e004e`

GitHub Actions run: `33092546336`

The candidate exact head completed the full gate successfully before this evidence document was committed:

- locked dependency install
- Prisma client generation
- migration deploy
- lint
- typecheck
- unit tests
- integration tests
- production build
- browser Meta Secret regression scan
- cleanup

This candidate evidence is not the final closeout gate. The documentation/evidence commit that contains this file must itself rerun the same complete gate before P1 can be declared `CLOSED (code/read-adapter complete)`.

## Live Meta connectivity

Live smoke status: **NOT EXECUTED**.

No real Meta credential has been used as part of deterministic CI evidence. Therefore this closeout does not claim that an external Meta Business, Ad Account or Insights endpoint has been reached successfully with production credentials.

When a separately provisioned server-side read credential is available, use `docs/runbooks/META_READONLY.md` and record the sanitized result separately. Never add real credential values to this file.

## Security evidence

- Real Meta credentials remain server-only configuration.
- `/api/meta/health` exposes only sanitized identity metadata or a stable error code.
- Adapter and route tests do not require real Meta credentials.
- Browser-bundle Secret regression remains part of the exact-head CI gate.
- P1 contains no Meta write implementation.

## Closeout rule

P1 may be declared closed only when the exact commit containing this closeout document is fully green on the complete GitHub Actions gate. A green prior candidate is necessary but not sufficient.
