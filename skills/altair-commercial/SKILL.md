---
name: altair-commercial
description: Plan and develop AltAir360 monetization, sponsored shortcuts, valid-click billing, advertiser and admin dashboards, pricing experiments, and commercial rollout. Use for AltAir360 commercial roadmap work; ordinary clock, weather, or ambient styling changes do not need this skill.
---

# AltAir360 commercial planning

Respond in Persian unless requested otherwise. Preserve AltAir360 as a local-first
Persian workspace with an uncluttered ambient mode. The commercial objective is
clearly labeled sponsored links with defensible click billing, supplemented by
optional Pro and organizational subscriptions.

Read [the commercial blueprint](references/commercial-blueprint.md) for business
model, campaign UX, measurement, billing, milestones, and acceptance criteria.
Its numbers, thresholds, and timing are proposals, not market facts or approved
contracts. Revise them when evidence or the user's choices change.

## Ground decisions in current code

Locate the checkout from the current project, without depending on a fixed machine
path. Inspect applicable AGENTS.md and relevant files. Initial baseline locations:
`features/bookmarks/bookmark-model.ts`,
`features/bookmarks/ui/BookmarkManager.tsx`, `lib/browser/bookmark-storage.ts`,
`components/SketchWorkspace.tsx`, `components/AmbientView.tsx`,
`server/AltAir.MarketApi/Program.cs`, and `wxt.config.ts`.

Separate implemented behavior, proposals, and unresolved assumptions. Bookmark
storage uses a strict versioned schema: adding commercial fields without a
migration would break validation. Browser topSites ranking is not AltAir360 click
telemetry. Local authentication and an API proxy do not establish production
advertiser isolation or billing readiness.

## Commercial invariants

- Separate personal bookmarks from the campaign catalog. Label sponsored cards,
  allow persistent dismissal and disablement, and require user action to save a
  personal bookmark. Never silently restore a removed brand. Keep ambient and
  offline scenes free of commercial cards by default.
- Do not infer advertising interests from bookmarks, topSites, notes, browsing
  history, or weather location. Do not expose bookmark lists in admin. Consent
  alone cannot override Chrome Limited Use restrictions.
- Distinguish direct sponsored placement from affiliate monetization. Recheck
  official store policies before launch or changing data use; the reference
  links are starting points, not certification of store acceptance.
- Separate raw, rejected, pending, billable, and reversed clicks. Clients cannot
  establish a human click, authorize spend, or set prices. Require server-side
  idempotency, eligibility, atomic budget enforcement, and a reconciliable ledger.
- Anti-abuse identifiers are pseudonymous, bounded by purpose and retention, and
  neither anonymous nor fraud-proof. VPN/shared IP alone cannot establish fraud.
  Advertisers receive aggregate campaign reports, not individual event streams.
- Core local features work during commercial outages. Never charge delayed offline
  events or route personal bookmarks through tracking redirects.

## Deliver work that can be executed

For planning, write or update a versioned Markdown artifact in the project. State
revenue mix, customer hypotheses, experiments, success/stop criteria, unit economics
and sensitivity, then connect the next milestone to file-level changes and
acceptance criteria. Identify currency units; separate booked, collected, and
refunded revenue. Research changing pricing, market, product, and policy claims
from current primary sources. Do not invent Iranian market size, CPC rates,
competitor profit, or guaranteed success.

For authorized implementation, choose the smallest coherent milestone from the
current backlog, inspect code again, implement, and verify. Planning does not
authorize production tracking, advertiser outreach, charging, or deployment.
Loading this skill does not authorize unrelated implementation. Report what
actually shipped and what remains. Advance staged rollout only with pilot evidence,
a tested kill switch, and reconciliation. If CPC economics fail, revise the model
instead of increasing advertising volume automatically.
