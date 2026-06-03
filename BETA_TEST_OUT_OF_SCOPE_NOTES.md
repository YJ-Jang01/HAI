# Beta Test Notes Outside Current GroundedCompare Scope

Last updated: 2026-06-02

These are beta-tester complaints that are valid product feedback, but they are not part of the current AI Criteria Lens implementation scope described in `docs/IMPLEMENTATION.md` and `docs/SERVICE_DATA_FLOW.md`.

## Out-of-scope complaints

- Account, sign-in, checkout, and cart payment flows are non-functional prototype surfaces. The current scope is AI-assisted product search, criteria decomposition, evidence-backed comparison, and study logging.
- The UI resembles an Amazon-style shopping page, but it is not intended to match Amazon production behavior exactly. Differences in marketplace navigation, account behavior, delivery promises, and checkout trust signals should be treated as prototype limitations.
- Product and review data are synthetic demo data. Human-quality commercial catalog copy, real brand voice, seller policies, shipping promises, and real buyer-review distribution need a separate content QA/gold-data process.
- Large-scale production deployment concerns such as authentication, rate limiting, monitoring dashboards, payment security, and support tooling are not in the current local demo scope.

## How to handle later

- Keep these notes separate from AI Criteria Lens usability work.
- Revisit them only after the core flow is stable: natural-language search, DB-backed filter grounding, criteria clarification, product comparison matrix, evidence access, and study logging.
