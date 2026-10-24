import type { ContentPack } from '../engine/types'

export const legacyPack: ContentPack = {
  id: 'agent-boundaries',
  version: '0.1.0',
  maturity: 'draft',
  sources: [
    { title: 'OWASP Top 10 for Agentic Applications', url: 'https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/', note: 'Draft mapping, canonical version not yet reviewed.' },
    { title: 'NIST AI RMF', url: 'https://www.nist.gov/itl/ai-risk-management-framework', note: 'Context reference, not a compliance mapping.' }
  ],
  questions: [
    { id: 'delegation', title: 'Can an agent delegate work to another agent or background task?', explanation: 'Delegated work may outlive the initiating request and widen the effective path to a target.', scope: 'component', capability: 'delegation', revision: '1' },
    { id: 'direct-target-access', title: 'Can this recorded workflow reach a target without the harness?', explanation: 'A central harness is not complete mediation if this relationship has direct credentials, routes, or tool access.', scope: 'relationship', capability: 'delegation', revision: '1' },
    { id: 'untrusted-input', title: 'Does the system process untrusted repository, ticket, document, web, or tool content?', explanation: 'Untrusted instructions can influence a model or downstream tool decision.', scope: 'component', capability: 'untrusted-inputs', revision: '1' },
    { id: 'code-execution', title: 'Can supplied or generated code run?', explanation: 'Code execution changes the impact of untrusted inputs and requires isolation assumptions.', scope: 'component', capability: 'code-execution', dependsOn: { questionId: 'untrusted-input', equals: 'yes' }, revision: '1' },
    { id: 'privileged-credentials', title: 'Are credentials available to the execution environment?', explanation: 'Credentials reachable during execution can be exposed or used by untrusted code.', scope: 'component', capability: 'credentials', revision: '1' },
    { id: 'shared-memory', title: 'Is memory or context shared across users, agents, or trust domains?', explanation: 'Shared state can cross intended isolation boundaries.', scope: 'component', capability: 'memory', revision: '1' },
    { id: 'external-write', title: 'Can the system change repositories, pipelines, production systems, or communicate externally?', explanation: 'Writes require constrained authority, approval points, and recoverable outcomes.', scope: 'component', capability: 'writes', revision: '1' },
    { id: 'egress', title: 'Can tools make outbound network connections?', explanation: 'Outbound connections can bypass intended mediation or move sensitive data.', scope: 'component', capability: 'egress', revision: '1' },
    { id: 'revocation', title: 'Can authority be cancelled or revoked while work is active?', explanation: 'Long-running tasks need a live check and defined behavior for partial outcomes.', scope: 'component', capability: 'recovery', revision: '1' },
    { id: 'audit', title: 'Are decisions and target actions recorded with their initiating and execution identities?', explanation: 'An audit trail needs enough context to support later review, without claiming authenticated attribution.', scope: 'platform', capability: 'audit', revision: '1' }
  ],
  threats: [
    { id: 'T-UNTRUSTED-EXEC', title: 'Untrusted content reaches privileged execution', scenario: 'Untrusted content can influence code execution while credentials are available to that environment.', scope: 'component', requires: { answers: [{ questionId: 'untrusted-input', equals: 'yes' }, { questionId: 'code-execution', equals: 'yes' }, { questionId: 'privileged-credentials', equals: 'yes' }] } },
    { id: 'T-DELEGATION-BYPASS', title: 'Delegated work bypasses intended mediation', scenario: 'A delegate can directly reach a target, so harness policy may not cover the action path.', scope: 'relationship', requires: { answers: [{ questionId: 'delegation', equals: 'yes', participant: 'source' }, { questionId: 'direct-target-access', equals: 'yes', participant: 'scope' }], relationshipTypes: ['delegates', 'invokes'] } },
    { id: 'T-SHARED-CONTEXT', title: 'Shared context crosses trust boundaries', scenario: 'Context or memory may reveal data or instructions between users, agents, or trust domains.', scope: 'component', requires: { answers: [{ questionId: 'shared-memory', equals: 'yes' }] } },
    { id: 'T-UNCONTROLLED-EGRESS', title: 'Outbound path can bypass data and policy controls', scenario: 'Tools can make outbound connections and may move data or invoke destinations outside intended controls.', scope: 'component', requires: { answers: [{ questionId: 'egress', equals: 'yes' }] } },
    { id: 'T-IRREVOCABLE-WORK', title: 'Active work cannot be reliably stopped', scenario: 'Authority or execution cannot be revoked during active work, leaving partial outcomes unclear.', scope: 'component', requires: { answers: [{ questionId: 'revocation', equals: 'no' }] } }
  ]
}
