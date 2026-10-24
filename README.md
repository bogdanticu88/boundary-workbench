![Boundary Workbench](public/brand/logo.png)

# Boundary Workbench 0.2.1

Local design-stage threat modelling for agent platforms. Independent product; no employer branding or endorsement. No hosted service, account, model API, or telemetry is required.

## Run

Requires a supported Node.js release compatible with the checked-in Vite version (Node 22.12+ or 24.0+; use a maintained LTS release) and npm.

```sh
npm ci
npm run dev
```

Open the localhost address printed in the terminal. Development binds to `127.0.0.1:5174` to keep this version separate from a previous app on port 5173. Do not expose the development server to other machines. Installation may require network access. Core use works offline after setup.

The supplied working copy may already contain dependencies; `npm run dev` is then sufficient. `npm run build` produces a static production build; `npm run preview` previews it on loopback port 4174. This is not a public deployment.

## Start

Version 0.2.1 makes **Guided interview** the default assessment experience. It presents one question at a time, offers plain-language help, records Not decided as uncertainty and requires a reason before continuing with Does not apply. Capability discovery is a short interview; it can be revisited. The advanced editor retains the bulk questions and technical controls. Existing regression tests now explicitly choose that editor when exercising bulk form behaviour; their assertions are retained.

Setup asks for the first agent's name and purpose, with capability selection optional. Describe additional agents from the interview. Starting profiles open topics but do not answer security controls. The interview and editor use the same assessment, rules and autosave path; there is no LLM behind the interview.


Choose **Start guided setup** to record purpose, owner, environment and known capabilities. It creates an initial editable harness/agent or workflow structure. Choosing **Explore fictional example** loads Orion, a synthetic platform containing a harness, two distinct agents, a repository and a target. Replacement of an existing nonempty draft requires confirmation; export JSON first.

The workspace provides:

- Persistent navigation and light/dark appearance.
- Architecture lanes with exact relationship lists, editable identities, authority, data classification and trust boundaries.
- Seven assessment domains, scope selection, search, dependencies, design notes and explicit uncertainty.
- 47 draft questions and 29 authored threat templates with applicability explanations.
- Design-response guidance on selected templates and one-click linked requirement creation.
- A security-review preparation view with unanswered questions, unknowns, changed conclusions and unassigned responsibilities.
- Self-contained HTML export with full scenarios, requirements, evidence and an answer appendix. Browser print-to-PDF uses the report's A4 print stylesheet.

This is an engineering aid, not a compliance certification or automated approval system. Framework references supply context; the current pack does not claim clause-level or comprehensive framework coverage. Proposed controls and owner declarations are not verified controls. Review and business risk acceptance happen outside the application.

## Data and portability

Drafts use IndexedDB on the current browser origin. Browser storage is not encrypted by this application, is not a backup, and is not a tamper-proof audit. Protect the device and exported files appropriately. Export JSON for a durable copy. The new default origin keeps an old version's browser draft separate; import its exported JSON to move it here.

An old `agent-boundaries` 0.1.0 assessment requires an explicit content upgrade to 0.2.0. The UI offers the original JSON download before upgrade. An upgrade retains declarations, notes, manual threats, linked decisions and prior conclusions that would otherwise disappear; it flags them for review. Other incompatible pack versions remain blocked. No remote pack update is performed.

Capabilities describe platform-level discovery, not per-agent controls. Component/workflow answers remain scoped and are not inherited automatically. Unselected capabilities are undiscovered; explicitly absent capabilities are different. Agent-specific questions exclude passive repositories and target components. More precise per-component capability discovery and richer multi-hop path analysis remain future work.

JSON and HTML use a reconciled snapshot. The SHA-256 covers exact canonical UTF-8 exported JSON bytes and is an integrity identifier, not an authenticated signature. Do not edit the exported JSON if you need to reproduce its existing digest.

Deletion reports cascade impact and requires confirmation. It may remove dependent design records. Export first when keeping history matters. There is no multi-user access control or authenticated approval record in a local application.

## Development and checks

```sh
npm test
npm run lint
npm run build
```

All original 26 checks remain in the suite. The current suite has 39 checks. Additional tests cover setup, domain navigation, appearance, content upgrades, scope filtering, capability exclusion and report detail. UI tests use jsdom and fake IndexedDB. They cannot verify native browser persistence, visual layout, download behaviour or PDF pagination.

Acceptance test exports are written to `test-output/` under the current project. Source code, content schemas, engine, UI components and report generation are separated. Do not commit private assessment exports or credentials.

## Limitations and release status

Version 0.2 is a substantial functional and visual iteration, not a completed enterprise assurance product. Content and regulatory screening prompts require specialist review before reliance. There is no scanner, runtime enforcement, authenticated review, automatic regulatory classification, repository ingestion, hosted collaboration or model integration.

Real-browser desktop/narrow-screen and print inspection remain outstanding in this execution environment because local listening ports are blocked. No claim of visual acceptance is made from simulated UI tests. Formal framework mappings, deeper workflow semantics and broader adversarial regression fixtures are future work. Third-party dependencies and referenced publications retain their respective licences and terms.

## License

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Mihai-Bogdan Ticu. Third-party dependencies and referenced framework publications retain their own licences; linking a publication does not relicense it.
