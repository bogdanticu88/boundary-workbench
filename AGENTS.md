# Project instructions

Keep the application local-first and independent of an external model service. Do not add telemetry, remote assets or network calls to core workflows. Do not commit, push or deploy without explicit user instruction.

Use the versioned schemas and pure assessment engine as the data contract. Preserve stable IDs, manual decisions, evidence and unknowns. Never mark controls verified, risks accepted or assessments approved based on questionnaire completion or an assistant suggestion.

Keep content versions pinned. Changes to question applicability or threat semantics require an explicit pack version and a migration review. Do not silently reinterpret old assessments. References are not certification or proof of framework coverage.

Run npm test, npm run lint, and npm run build after functional changes. UI tests use simulated browser APIs; explicitly distinguish them from actual browser and print checks. Do not weaken acceptance assertions to make them pass.
