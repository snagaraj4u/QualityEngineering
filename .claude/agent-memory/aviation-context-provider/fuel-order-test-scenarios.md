---
name: Fuel Order Test Scenarios
description: Complete test scenario catalog for aviation fuel order creation covering happy path, validation failures, edge cases, and integration points
type: project
---

## Test Priority Order
1. Safety validations (fuel type mismatch) — P0, non-negotiable
2. Quantity bounds (over-capacity, under-regulatory-minimum)
3. Unit conversion and density calculation accuracy
4. Workflow lifecycle (create -> confirm -> uplift -> billing)
5. Permission and role-based access controls
6. Edge cases and failure modes

## Happy Path Scenarios
- TC-FUEL-001: Standard domestic Jet-A order at contracted FBO
- TC-FUEL-002: International order with KG unit, density conversion applied
- TC-FUEL-003: Order auto-applies contracted IPA rate

## Hard Validation Failures (P0/P1)
- TC-FUEL-004: Avgas 100LL ordered for turbine aircraft — must BLOCK
- TC-FUEL-005: Quantity > aircraft max tank capacity — must BLOCK
- TC-FUEL-006: Fuel below regulatory minimum for planned flight — block/warn
- TC-FUEL-008: Service time in the past — must BLOCK
- TC-FUEL-024: Invalid/non-existent airport code — must BLOCK

## Soft Warning / Override Scenarios
- TC-FUEL-007: Quantity below FBO minimum delivery (allow with justification)
- TC-FUEL-009: Service time within FBO lead time (warn, allow override)
- TC-FUEL-010: No contracted supplier at airport (spot rate prompt)
- TC-FUEL-015: Aircraft has open maintenance discrepancy (warn)

## Edge Cases
- TC-FUEL-011: Uncontrolled airport with mobile fueler only
- TC-FUEL-012: Temperature-adjusted quantity (extreme cold station)
- TC-FUEL-013: Partial/top-up order (aircraft has fuel on board)
- TC-FUEL-014: Duplicate order detection (same tail + airport + time window)
- TC-FUEL-016: Multi-stop trip linking all fuel orders to same trip ID
- TC-FUEL-017: SAF blend order (validate <= 50% ratio)
- TC-FUEL-018: Defuel order (distinct from uplift in audit trail)
- TC-FUEL-019: AOG emergency order (bypasses lead time warning, escalates)
- TC-FUEL-020: Cancellation after FBO acknowledgment (cancellation fee logic)

## Airport Code Handling
- TC-FUEL-023: IATA code (LAX) resolves same as ICAO (KLAX)

## International / Currency
- TC-FUEL-025: International order in GBP converted to USD with timestamp

## Role-Based Access
- TC-FUEL-021: Billing user cannot create fuel order
- TC-FUEL-022: Dispatcher without station authorization blocked or escalated

## Integration Test Scenarios
- FBO inventory insufficient: route to alternate supplier
- Flight plan fuel minimum cross-reference: warn if order < plan minimum
- Tail swap after order created: flag discrepancy
- Uplift confirmed: triggers AP invoice creation
- IPA contract expired: fallback to spot rate with notification

**Why:** Aviation fuel ordering spans safety, regulatory compliance, financial, and operational domains — test coverage must be broader than typical CRUD testing.
**How to apply:** Use this catalog as a baseline checklist; expand with product-specific UI/workflow details as discovered.
