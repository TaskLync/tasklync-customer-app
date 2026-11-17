# Location Remediation Progress

Source of truth: `audits/location-address/01…14` (audit 2026-11-16) and the code.
Status values: `Planned` → `In progress` → `Done` / `Partial` / `Deferred (reason)` / `External (dependency)`.

This file is updated as each stage lands; the final state is reflected in `02_FIXED_ISSUES_REGISTER.md`.

| Stage | Scope | Status |
|---|---|---|
| 1 | GPS confidence tiers, approximate permission, jump filter, acquisition option fixes | In progress |
| 2 | Geocoding/search reliability, provider circuit breaker, backend geo proxy | Planned |
| 3 | Structured address + instructions end-to-end (DB → API → app → booking → worker) | Planned |
| 4 | Booking / custom-request location trust | Planned |
| 5 | Client state, picker UX, offline draft | Planned |
| 6 | Security config, tests, deliverables | Planned |
