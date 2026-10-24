export type AnswerValue = 'yes' | 'no' | 'unknown' | 'not-applicable'
export type Applicability = 'applicable' | 'not-applicable' | 'unresolved'
export type Stage = 'design' | 'implementation'
export type ScopeType = 'platform' | 'component' | 'relationship'
export type ScopeId = 'platform' | `component:${string}` | `relationship:${string}`
export type CapabilityState = 'selected' | 'absent' | 'unknown' | 'not-selected'

export interface Answer {
  value: AnswerValue
  rationale?: string
  updatedAt: string
  inactive?: boolean
  needsReview?: boolean
  inheritedFrom?: ScopeId
}
export interface Component { id: string; name: string; kind: ComponentKind; environment: string; dataClassification: string; identity: string; authority: string }
export type ComponentKind = 'user' | 'harness' | 'agent' | 'tool' | 'model' | 'memory' | 'queue' | 'execution' | 'repository' | 'pipeline' | 'credential-store' | 'target'
export interface Relationship { id: string; from: string; to: string; type: RelationshipType; trustBoundary: string; intended: boolean }
export type RelationshipType = 'reads' | 'writes' | 'invokes' | 'delegates' | 'authenticates' | 'publishes' | 'passes-context'
export interface Threat {
  id: string; templateId?: string; scope: ScopeId; title: string; scenario: string; applicability: Applicability; triggeringFacts: string[]
  disposition: 'open' | 'mitigation-proposed' | 'evidence-supplied' | 'external-review-required' | 'excluded'
  treatmentRationale?: string; applicabilityRationale?: string; owner?: string; requirementIds: string[]; evidenceIds: string[]; manual?: boolean; needsReview?: boolean
}
export interface Requirement { id: string; title: string; acceptanceCriteria: string; owner: string; scope: string; status: 'proposed' | 'validated'; threatIds: string[]; evidenceIds: string[] }
export interface Evidence { id: string; type: 'owner-declaration' | 'implementation-reference' | 'test-evidence'; reference: string; scope: string; date: string; assessmentRevision: number; origin: string; requirementIds: string[]; threatIds: string[] }
export interface ContentPackRef { id: string; version: string; maturity: 'draft' | 'reviewed' }

export interface Assessment {
  schemaVersion: '1.1'; applicationVersion: string; id: string; revision: number; createdAt: string; updatedAt: string; stage: Stage; title: string; scope: string; assumptions: string; exclusions: string
  components: Component[]; relationships: Relationship[]; capabilities: Record<string, CapabilityState>; answers: Record<string, Answer>; threats: Threat[]; requirements: Requirement[]; evidence: Evidence[]; packs: ContentPackRef[]; profile?: { owner: string; reviewer: string; purpose: string; environment: string; assessmentType: string }
}
export interface Question {
  id: string; title: string; explanation: string; scope: ScopeType; capability?: string
  dependsOn?: { questionId: string; equals: AnswerValue }; revision: string; domain?: string; componentKinds?: ComponentKind[]
}
export interface ThreatTemplate {
  id: string; title: string; scenario: string; scope: ScopeType; componentKinds?: ComponentKind[]; guidance?: string; requires: { capability?: string; answers?: Array<{ questionId: string; equals: AnswerValue; participant?: 'scope' | 'source' | 'destination' }>; relationshipTypes?: RelationshipType[] }
}
export interface ContentPack {
  id: string; version: string; maturity: 'draft' | 'reviewed'; sources: Array<{ title: string; url: string; note: string }>
  questions: Question[]; threats: ThreatTemplate[]
}
export interface PreparedSnapshot { assessment: Assessment; digest: string; bytes: string }
