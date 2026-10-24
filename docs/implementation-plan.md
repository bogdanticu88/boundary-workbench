> Historical M0/M1 plan. See iteration-0.2.md and README.md for current functionality and launch instructions.

# Implementation plan

## M0

1. Define a versioned portable assessment contract and content-pack shape.
2. Keep assessment evaluation independent from browser storage and rendering.
3. Ship fictional fixtures and draft source mappings. This release does not claim framework coverage or legal compliance.

## M1

1. Build a local-first workspace with IndexedDB draft recovery and JSON portability.
2. Model components, relationships, capability selections, adaptive questions, candidate and manual threats, requirements, and evidence.
3. Generate a self-contained non-executable HTML report and use browser print-to-PDF.
4. Validate imports before replacement, preserve manual work during reevaluation, and make uncertainty visible.

## Provisional decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Product name | Boundary Workbench | Independently branded working name, not a final trademark decision. |
| Stack | React, TypeScript, Vite, AJV | Small local application with a shared pure TypeScript engine. |
| Persistence | IndexedDB plus explicit JSON import/export | Convenient recovery without treating browser storage as a backup. |
| Report | Self-contained HTML and browser print styles | Offline review without a local backend or executable report code. |
| Licence | Not selected | Required before public release. |
| Runtime/browser support | Not selected | Verify and document before release. |

## Limitations

This application records declared intent and supplied evidence. It does not authenticate reviewers, scan code, fetch URLs, execute tests, confirm controls, or make compliance or approval decisions.
