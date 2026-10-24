# Iteration 0.2 delivery notes

Built in a separate working copy; the original project was not changed. This is a product-depth iteration over the tested M0/M1 foundation.

Implemented: persistent sidebar workspace; three-step setup; explicit replacement confirmation; built-in fictional example; light/dark themes; responsive CSS; architecture overview and relationship list; editable identity/authority/data and trust boundaries; seven assessment domains; scoped search and capability discovery; 47 authored questions and 29 templates; design response guidance; linked requirement creation; security review preparation; richer offline report with answer appendix; explicit content upgrade from 0.1.0; portable acceptance-test output directory; loopback-only launch defaults.

Retained: local IndexedDB drafts, schema and semantic validation, scoped answers, no implicit inheritance, safe imports, reconciled export snapshots, SHA-256 identifiers, confirmed deletion, evidence references, and no external model dependency.

Quality checks: 33 tests passed, including all original 26 acceptance/regression checks. Lint passed without warnings. Production build passed. Seven new tests cover pack validation, passive component exclusions, missing sandbox, explicit capability absence, content upgrade preservation, report provenance, guided setup, domain navigation and appearance (some assertions share a test).

Limits: simulated UI checks use jsdom and fake IndexedDB. Real-browser visual, narrow-screen and print acceptance is outstanding because the execution environment blocks local listening ports. No screenshot or PDF quality claim is made. Content is draft authored methodology and background references, not verified regulatory mappings. Capabilities remain platform-level discovery, with scoped answers; richer per-component discovery and multi-hop analysis are future work.

Run this copy on localhost port 5174 to keep its draft origin separate from the old version. Existing 0.1.0 JSON imports require an explicit methodology upgrade. Export the original before upgrading.
