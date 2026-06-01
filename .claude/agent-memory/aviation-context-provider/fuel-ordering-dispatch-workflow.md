---
name: Dispatch Role - Fuel Ordering Workflow
description: Complete fuel order creation workflow for dispatch role including required fields, validation rules, and system integration points
type: project
---

## Dispatcher Fuel Order Workflow

Dispatchers create fuel orders based on flight plan fuel requirements. Orders are safety-critical and must enforce strict validation.

### Required Order Fields
- Aircraft tail number / registration (must match fleet registry)
- Departure airport (ICAO or IATA code)
- Fuel type (must match aircraft engine type)
- Quantity + unit of measure (USG, LTR, KG, LBS)
- Requested service time (UTC)
- Flight number / Trip ID
- FBO / Supplier (must have into-plane agreement or accept spot rate)
- Uplift type: Into-wing, Overwing, Defuel
- Cost center / account for billing allocation

### Hard Stop Validation Rules
- Fuel type incompatible with aircraft engine type (SAFETY CRITICAL — P0 defect if missing)
- Quantity exceeds aircraft maximum fuel capacity
- Airport code not in system
- Aircraft tail not in fleet registry
- Service date/time in the past (without special permission)

### Soft Warning Rules (override allowed with justification)
- Quantity below FBO minimum delivery threshold
- Service time within FBO lead time window
- No contracted supplier at station
- Aircraft has open maintenance discrepancy
- Calculated fuel below regulatory minimum

### Calculated/Derived Fields
- Unit conversion: USG <-> LTR <-> KG (density-dependent, temperature-corrected)
- Net uplift = Required total fuel - Current fuel on board
- Estimated cost = Quantity x Contract rate (or spot rate)
- Weight = Volume x Density (ASTM D1250 temperature correction tables)

### Key Integration Points
- Flight Planning System: fuel requirement cross-reference
- Fleet/Aircraft Records: fuel type, capacity, maintenance status
- FBO/Supplier system: inventory availability, lead time, acknowledgment
- Billing/AP: completed uplift triggers payable transaction
- Vendor management: IPA (Into-Plane Agreement) rate lookup

**Why:** Fuel ordering is safety-critical; misfueling or under-fueling can cause catastrophic incidents. Tests must reflect regulatory and physical constraints.
**How to apply:** When generating test cases for any fuel ordering feature, always include the P0 safety validations first, then quantity bounds, then workflow completeness.
