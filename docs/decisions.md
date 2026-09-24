# Architecture decisions

## ADR-001 — Backend ownership
Backend owns authentication, pricing, order creation, payment state and supplier integrations.

## ADR-002 — Money
Store monetary values as integer minor units, never floating point.

## ADR-003 — Provider abstraction
Supplier, payment and delivery integrations use adapters so providers can be replaced.

## ADR-004 — API versioning
Public API starts at /api/v1.
