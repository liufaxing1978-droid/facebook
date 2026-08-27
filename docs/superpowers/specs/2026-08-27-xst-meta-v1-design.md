# XST Meta V1 System Design

## Purpose

XST Meta is the internal Facebook / Meta growth operating system for 兴善堂. It connects content production, organic publishing, paid promotion, website behavior, conversion tracking, analytics and AI recommendations into one closed loop.

Core loop:

`Content -> Organic Post -> Organic Performance -> Promotion Recommendation -> Campaign / Ad Set / Ad -> Website Behavior -> Conversion -> AI Recommendation -> Approved Optimization`

## Product Scope

V1 serves internal first-party assets only:

- Facebook Page
- Instagram
- Meta Business
- Meta Ad Account
- Meta Pixel / Dataset
- xingshantang.org

V1 does not include multi-tenant SaaS, Google Ads, TikTok Ads, autonomous AI spending, complex CRM, or fully automatic ad optimization.

## Two Promotion Entry Paths

1. Organic-first: publish content, observe organic performance, then promote high-potential posts.
2. Direct ads: create a dark ad / paid creative without publishing a public post first.

## Organic Publishing Flow

1. Import content from xingshantang.org or manual input.
2. Generate Traditional Chinese, Simplified Chinese and English variants.
3. Generate primary text, headline, CTA and creative suggestions.
4. Run policy-risk assistance checks.
5. Human preview and approval.
6. Publish or schedule to Facebook / Instagram.
7. Sync organic metrics and website behavior.

## Promotion Score

Not every post should be promoted. The system computes a Promotion Score using:

- engagement quality
- link click quality
- landing-page reading depth
- registration / contact / purchase conversion
- policy / promotion risk

A high score enables a "Recommended for Promotion" action.

## Paid Promotion Flow

`Content/Post -> Objective -> Region -> Audience -> Budget/Schedule -> Creative Variants -> UTM/Pixel -> Preview -> Policy/Budget Check -> Local Draft -> Meta PAUSED -> Human Activation -> Insights Sync`

Country tests should be split by Ad Set where practical so Taiwan, Hong Kong, Malaysia, Singapore, US, Canada and Australia can be evaluated independently.

## Architecture

### Application Layers

- Web UI
- Application API
- Domain services
- Infrastructure adapters
- External systems

### Main Domain Services

- Content
- Publishing
- Promotion
- Ads
- Analytics
- Conversion
- AI Recommendation
- Approval
- Automation

### Infrastructure

- Next.js + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ
- Meta Adapter
- AI Adapter
- Website Adapter
- Docker + Nginx + Cloudflare

Target production host: `ads.xingshantang.org`.

## Meta Adapter Boundary

All Meta API access must be centralized under `packages/meta`. Business code and UI components must not directly call `graph.facebook.com`.

Adapter responsibilities include:

- authentication and token handling
- Graph API versioning via `META_GRAPH_VERSION`
- Page publishing
- Ad Account / Campaign / Ad Set / Ad reads
- Creative and Insights access
- Conversions API
- consistent error mapping
- rate-limit handling

## Data Model Principles

The system keeps Meta-attributed performance separate from first-party business facts.

Data layers:

1. Meta advertising metrics.
2. Website first-party events.
3. Attribution/linkage data using UTM/session/event identifiers.
4. Long-term marketing learning data.

Important website events include PageView, ViewContent, ArticleRead25/50/75/90, ToolOpen, ToolComplete, Register, Contact, MemberSubscribe, InitiateCheckout and Purchase.

Browser Pixel and server CAPI events use the same `event_id` for deduplication.

## AI Role

AI acts as analyst, strategist, copywriter and creative advisor. It is not the direct controller of ad spend.

Decision flow:

`Observation -> Metric Engine -> AI Skill / Recommendation -> Policy Engine -> Approval -> Execution Command -> Meta Adapter -> Verification -> Audit Log`

AI Skill library will include campaign planning, ad diagnostics, budget optimization, creative strategy, copywriting, policy review, audience research, experiment design, CAPI diagnostics, landing-page analysis, competitor-ad analysis and daily growth analysis.

## Safety and Control

V1 requires human approval for any real budget or delivery changes.

Safety controls:

- account daily cap
- Campaign / Ad Set caps
- maximum budget-change percentage
- daily change-frequency limits
- abnormal-spend alerts
- global Kill Switch
- encrypted server-only token storage
- token redaction from logs
- audit logs for sensitive operations
- post-write verification against Meta state

## Reliability

The internal ad state machine distinguishes local draft, Meta-created, paused, review pending, active, rejected, error and archived states.

All external writes must have `operation_id` and idempotency protection. HTTP success alone is not final success; the system must verify the resulting Meta state before marking an operation VERIFIED.

## System Health and Data Quality

The product must surface:

- token and permission health
- Insights synchronization lag
- sync failure rate
- Pixel / CAPI event volume
- event deduplication quality
- missing UTM rate
- abnormal spend
- ad rejection status
- queue backlog
- PostgreSQL / Redis health

## Major UI Areas

- Dashboard
- Content Center
- Asset Center
- Ads Center
- Audience Center
- Analytics
- Conversion Tracking
- AI Optimization
- Approval Center
- System Settings

## Delivery Roadmap

- P0: engineering baseline, CI, database, Meta contracts
- P1: identity, settings, Meta connection foundation
- P2: real Meta read-only assets and Insights
- P3: data synchronization and Dashboard
- P4: content center and organic publishing
- P5: one-click promotion and paid draft creation
- P6: Pixel + CAPI
- P7: AI recommendations
- P8: Policy + Approval + Verification
- P9: experiments and marketing learnings
- P10: production hardening, deployment, monitoring, backup

## V1 Acceptance Chain

V1 is valuable only when this complete chain works with traceable data:

`Website Article -> AI Post -> Facebook Organic Publish -> Organic Metrics -> Promotion Recommendation -> Meta Draft -> Human Activation -> Insights -> Pixel/CAPI -> AI Diagnosis -> Human-Approved Optimization`
