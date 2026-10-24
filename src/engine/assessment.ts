import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import assessmentSchema from '../../schemas/assessment.schema.json'
import contentPackSchema from '../../schemas/content-pack.schema.json'
import type { Answer, Applicability, Assessment, ContentPack, PreparedSnapshot, ScopeId, Threat, ThreatTemplate } from './types'

const appVersion = '0.2.1'
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validateAssessmentSchema = ajv.compile(assessmentSchema)
const validatePackSchema = ajv.compile(contentPackSchema)
const limit = 1_000_000

export const answerKey = (scope: ScopeId, questionId: string) => `${scope}:${questionId}`
export const platformScope: ScopeId = 'platform'

export function createAssessment(): Assessment {
  const now = new Date().toISOString()
  return { schemaVersion: '1.1', applicationVersion: appVersion, id: crypto.randomUUID(), revision: 1, createdAt: now, updatedAt: now, stage: 'design', title: 'Untitled agent platform assessment', scope: '', assumptions: '', exclusions: '', components: [], relationships: [], capabilities: {}, answers: {}, threats: [], requirements: [], evidence: [], packs: [{ id: 'agent-boundaries', version: '0.2.0', maturity: 'draft' }] }
}

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`Invalid assessment: duplicate ${label}.`)
}

export function validatePack(pack: unknown): ContentPack {
  if (!validatePackSchema(pack)) throw new Error(`Invalid content pack: ${ajv.errorsText(validatePackSchema.errors)}`)
  const checked = pack as unknown as ContentPack
  unique(checked.questions.map((question) => question.id), 'question IDs')
  unique(checked.threats.map((threat) => threat.id), 'threat template IDs')
  const questions = new Map(checked.questions.map((question) => [question.id, question]))
  for (const question of checked.questions) {
    if (question.dependsOn && !questions.has(question.dependsOn.questionId)) throw new Error(`Invalid content pack: ${question.id} depends on a missing question.`)
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('Invalid content pack: question dependency cycle.')
    if (visited.has(id)) return
    visiting.add(id)
    const parent = questions.get(id)?.dependsOn?.questionId
    if (parent) visit(parent)
    visiting.delete(id); visited.add(id)
  }
  checked.questions.forEach((question) => visit(question.id))
  for (const threat of checked.threats) for (const rule of threat.requires.answers ?? []) if (!questions.has(rule.questionId)) throw new Error(`Invalid content pack: ${threat.id} references a missing question.`)
  return checked
}

function migrate(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const legacy = input as Record<string, unknown>
  if (legacy.schemaVersion !== '1.0') return input
  const capabilities = Object.fromEntries(Array.isArray(legacy.capabilities) ? legacy.capabilities.map((name) => [String(name), 'selected']) : [])
  const answers = Object.fromEntries(Object.entries((legacy.answers as Record<string, Answer>) ?? {}).map(([questionId, answer]) => [answerKey(platformScope, questionId), { ...answer, inactive: false }]))
  return { ...legacy, schemaVersion: '1.1', applicationVersion: appVersion, capabilities, answers, packs: Array.isArray(legacy.packs) && legacy.packs.length ? legacy.packs : [{ id: 'agent-boundaries', version: '0.2.0', maturity: 'draft' }], threats: ((legacy.threats as Array<Record<string, unknown>>) ?? []).map((threat) => ({ ...threat, scope: platformScope, requirementIds: [], evidenceIds: [], treatmentRationale: threat.rationale, applicabilityRationale: '', needsReview: false })), requirements: (legacy.requirements as Array<Record<string, unknown>> ?? []).map((item) => ({ ...item, owner: item.owner ?? '', scope: '', threatIds: [], evidenceIds: [] })), evidence: (legacy.evidence as Array<Record<string, unknown>> ?? []).map((item) => ({ ...item, assessmentRevision: legacy.revision, origin: 'legacy import', requirementIds: [], threatIds: [] })) }
}

export function validateImportedAssessment(input: unknown): Assessment {
  const encoded = JSON.stringify(input)
  if (encoded.length > limit) throw new Error('Import exceeds the 1 MB assessment limit.')
  const migrated = migrate(input)
  if (!validateAssessmentSchema(migrated)) throw new Error(`Invalid assessment: ${ajv.errorsText(validateAssessmentSchema.errors)}`)
  const assessment = migrated as unknown as Assessment
  unique(assessment.components.map((item) => item.id), 'component IDs'); unique(assessment.relationships.map((item) => item.id), 'relationship IDs'); unique(assessment.threats.map((item) => item.id), 'threat IDs'); unique(assessment.requirements.map((item) => item.id), 'requirement IDs'); unique(assessment.evidence.map((item) => item.id), 'evidence IDs')
  const componentIds = new Set(assessment.components.map((item) => item.id))
  for (const relationship of assessment.relationships) if (!componentIds.has(relationship.from) || !componentIds.has(relationship.to) || relationship.from === relationship.to) throw new Error('Invalid assessment: relationship has a dangling or self reference.')
  const knownScopes = new Set<ScopeId>([platformScope, ...assessment.components.map((item) => `component:${item.id}` as ScopeId), ...assessment.relationships.map((item) => `relationship:${item.id}` as ScopeId)])
  for (const key of Object.keys(assessment.answers)) {
    const separator = key.lastIndexOf(':')
    if (separator < 1 || !knownScopes.has(key.slice(0, separator) as ScopeId)) throw new Error('Invalid assessment: answer has an invalid scope.')
  }
  for (const answer of Object.values(assessment.answers)) if (answer.value === 'not-applicable' && !answer.rationale?.trim()) throw new Error('Invalid assessment: not-applicable answers require a rationale.')
  const threatIds = new Set(assessment.threats.map((item) => item.id)); const requirementIds = new Set(assessment.requirements.map((item) => item.id)); const evidenceIds = new Set(assessment.evidence.map((item) => item.id))
  for (const threat of assessment.threats) {
    if (threat.disposition === 'excluded' && !threat.treatmentRationale?.trim()) throw new Error('Invalid assessment: excluded threats require a rationale.')
    if (threat.scope !== 'platform' && !knownScopes.has(threat.scope)) throw new Error('Invalid assessment: threat has an invalid scope.')
    for (const id of threat.requirementIds) if (!requirementIds.has(id)) throw new Error('Invalid assessment: threat has a dangling requirement link.')
    for (const id of threat.evidenceIds) if (!evidenceIds.has(id)) throw new Error('Invalid assessment: threat has a dangling evidence link.')
  }
  for (const requirement of assessment.requirements) { for (const id of requirement.threatIds) if (!threatIds.has(id)) throw new Error('Invalid assessment: requirement has a dangling threat link.'); for (const id of requirement.evidenceIds) if (!evidenceIds.has(id)) throw new Error('Invalid assessment: requirement has a dangling evidence link.') }
  for (const evidence of assessment.evidence) { for (const id of evidence.threatIds) if (!threatIds.has(id)) throw new Error('Invalid assessment: evidence has a dangling threat link.'); for (const id of evidence.requirementIds) if (!requirementIds.has(id)) throw new Error('Invalid assessment: evidence has a dangling requirement link.') }
  return assessment
}
export function validateAgainstPack(assessment: Assessment, pack: ContentPack) {
  validatePack(pack)
  const ids = new Set(pack.questions.map((question) => question.id))
  for (const key of Object.keys(assessment.answers)) {
    const questionId = key.slice(key.lastIndexOf(':') + 1)
    if (!ids.has(questionId)) throw new Error(`Invalid assessment: answer references unknown question ${questionId}.`)
  }
  const pinned = assessment.packs.find((item) => item.id === pack.id)
  if (pinned && (pinned.version !== pack.version || pinned.maturity !== pack.maturity)) throw new Error(`Assessment pins ${pack.id} ${pinned.version}; installed content is ${pack.version}.`)
  return assessment
}

function capabilityState(assessment: Assessment, template: ThreatTemplate) {
  if (!template.requires.capability) return undefined
  return assessment.capabilities[template.requires.capability] ?? 'not-selected'
}
function scopesFor(template: ThreatTemplate, assessment: Assessment): ScopeId[] {
  if (template.scope === 'platform') return [platformScope]
  if (template.scope === 'component') return assessment.components.filter(component => !template.componentKinds || template.componentKinds.includes(component.kind)).map((component) => `component:${component.id}` as ScopeId)
  return assessment.relationships.filter((relationship) => !template.requires.relationshipTypes || template.requires.relationshipTypes.includes(relationship.type)).map((relationship) => `relationship:${relationship.id}` as ScopeId)
}
function answersForScope(assessment: Assessment, scope: ScopeId, questionId: string, participant = 'scope'): Answer | undefined {
  const direct = participant === 'scope' ? assessment.answers[answerKey(scope, questionId)] : undefined
  if (direct && !direct.inactive) return direct
  if (scope.startsWith('relationship:') && participant !== 'scope') {
    const relationship = assessment.relationships.find((item) => `relationship:${item.id}` === scope)
    const id = participant === 'source' ? relationship?.from : relationship?.to
    if (id) { const answer = assessment.answers[answerKey(`component:${id}`, questionId)]; return answer && !answer.inactive ? answer : undefined }
  }
  return undefined
}
export function applicability(template: ThreatTemplate, assessment: Assessment, scope: ScopeId, pack?: ContentPack): { value: Applicability; facts: string[] } {
  const capability = capabilityState(assessment, template)
  if (capability === 'absent') return { value: 'not-applicable', facts: [`Capability "${template.requires.capability}" is ${capability}.`] }
  const facts: string[] = []; let unresolved = capability === 'unknown' || capability === 'not-selected'
  if (capability === 'unknown' || capability === 'not-selected') facts.push(`Capability "${template.requires.capability}" is unknown.`)
  for (const rule of template.requires.answers ?? []) {
    let factScope = scope
    if (scope.startsWith('relationship:') && rule.participant && rule.participant !== 'scope') {
      const relation = assessment.relationships.find(r => `relationship:${r.id}` === scope)
      if (relation) factScope = `component:${rule.participant === 'source' ? relation.from : relation.to}`
    }
    if (pack) {
      const state = activeQuestions(assessment, pack, factScope).find(q => q.question.id === rule.questionId)?.state
      if (state === 'skipped' || state === 'inactive') return {value:'not-applicable',facts:[`${rule.questionId} is inactive or explicitly excluded at ${factScope}.`]}
      if (state === 'pending') {unresolved=true;facts.push(`${rule.questionId} requires capability or parent discovery at ${factScope}.`);continue}
    }
    const answer = answersForScope(assessment, scope, rule.questionId, rule.participant)
    if (!answer || answer.value === 'unknown') { unresolved = true; facts.push(`${rule.questionId} is unanswered or unknown at ${scope}.`); continue }
    if (answer.value === 'not-applicable' || answer.value !== rule.equals) return { value: 'not-applicable', facts: [`${rule.questionId} does not meet the trigger at ${scope}.`] }
    facts.push(`${rule.questionId} is ${rule.equals} at ${scope}.`)
  }
  if (template.scope === 'relationship' && !scope.startsWith('relationship:')) return { value: 'unresolved', facts: ['A recorded relationship is required to assess this path.'] }
  return { value: unresolved ? 'unresolved' : 'applicable', facts }
}
export function evaluate(assessment: Assessment, pack: ContentPack): Threat[] {
  validatePack(pack)
  const existing = new Map(assessment.threats.filter((threat) => !threat.manual).map((threat) => [`${threat.templateId}:${threat.scope}`, threat]))
  return [...pack.threats.flatMap((template) => scopesFor(template, assessment).map((scope) => {
    const result = applicability(template, assessment, scope, pack); const prior = existing.get(`${template.id}:${scope}`)
    return { id: prior?.id ?? `${template.id}:${scope}`, templateId: template.id, scope, title: template.title, scenario: template.scenario, applicability: result.value, triggeringFacts: result.facts, disposition: prior?.disposition ?? 'open', treatmentRationale: prior?.treatmentRationale, applicabilityRationale: prior?.applicabilityRationale, owner: prior?.owner, requirementIds: prior?.requirementIds ?? [], evidenceIds: prior?.evidenceIds ?? [], needsReview: Boolean(prior?.needsReview || (prior && (prior.applicability !== result.value || JSON.stringify(prior.triggeringFacts) !== JSON.stringify(result.facts)))) } satisfies Threat
  })), ...assessment.threats.filter((threat) => threat.manual)]
}
export function activeQuestions(assessment: Assessment, pack: ContentPack, scope: ScopeId) {
  validatePack(pack)
  return pack.questions.filter(question => !scope.startsWith('component:') || !question.componentKinds || question.componentKinds.includes(assessment.components.find(c => `component:${c.id}` === scope)!.kind)).filter((question) => question.scope === (scope === platformScope ? 'platform' : scope.startsWith('component:') ? 'component' : 'relationship')).map((question) => {
    const capability = question.capability ? assessment.capabilities[question.capability] ?? 'not-selected' : 'selected'
    if (capability === 'absent') return { question, state: 'skipped' as const, reason: `Capability is ${capability}.` }
    if (capability === 'unknown' || capability === 'not-selected') return { question, state: 'pending' as const, reason: 'Capability is unknown.' }
    if (!question.dependsOn) return { question, state: 'active' as const, reason: 'Selected capability applies to this scope.' }
    const parent = answersForScope(assessment, scope, question.dependsOn.questionId)
    if (!parent || parent.value === 'unknown') return { question, state: 'pending' as const, reason: 'Parent answer is unanswered or unknown.' }
    if (parent.value !== question.dependsOn.equals) return { question, state: 'inactive' as const, reason: `Parent answer is ${parent.value}.` }
    return { question, state: 'active' as const, reason: 'Capability and parent answer apply.' }
  })
}
export function completeness(assessment: Assessment, pack: ContentPack) {
  const scopes: ScopeId[] = [platformScope, ...assessment.components.map((item) => `component:${item.id}` as ScopeId), ...assessment.relationships.map((item) => `relationship:${item.id}` as ScopeId)]
  const all = scopes.flatMap((scope) => activeQuestions(assessment, pack, scope).map((item) => ({ ...item, scope })))
  return { unanswered: all.filter((item) => item.state === 'active' && !assessment.answers[answerKey(item.scope, item.question.id)]).length, unknown: Object.values(assessment.answers).filter((item) => item.value === 'unknown' && !item.inactive).length, pending: all.filter((item) => item.state === 'pending').length, inactive: Object.values(assessment.answers).filter((item) => item.inactive).length, exclusions: Object.values(assessment.answers).filter((item) => item.value === 'not-applicable').length, architectureMissing: assessment.components.length === 0 }
}
export type DeleteKind = 'component' | 'relationship' | 'threat' | 'requirement' | 'evidence'
export function deletionImpact(assessment: Assessment, kind: DeleteKind, id: string) {
  const relationshipIds = kind === 'component' ? assessment.relationships.filter((item) => item.from === id || item.to === id).map((item) => item.id) : kind === 'relationship' ? [id] : []
  const scopes = new Set([kind === 'component' ? `component:${id}` : '', ...relationshipIds.map((item) => `relationship:${item}`)])
  const answerKeys = Object.keys(assessment.answers).filter((key) => [...scopes].some((scope) => scope && key.startsWith(`${scope}:`)))
  const threatIds = assessment.threats.filter((item) => (kind === 'threat' && item.id === id) || scopes.has(item.scope) || (kind === 'requirement' && item.requirementIds.includes(id)) || (kind === 'evidence' && item.evidenceIds.includes(id))).map((item) => item.id)
  const requirementIds = assessment.requirements.filter((item) => (kind === 'requirement' && item.id === id) || threatIds.some((threatId) => item.threatIds.includes(threatId)) || (kind === 'evidence' && item.evidenceIds.includes(id))).map((item) => item.id)
  const evidenceIds = assessment.evidence.filter((item) => (kind === 'evidence' && item.id === id) || threatIds.some((threatId) => item.threatIds.includes(threatId)) || requirementIds.some((requirementId) => item.requirementIds.includes(requirementId))).map((item) => item.id)
  return { relationshipIds, answerKeys, threatIds, requirementIds, evidenceIds }
}
export function deleteWithCascade(assessment: Assessment, kind: DeleteKind, id: string): Assessment {
  const impact = deletionImpact(assessment, kind, id)
  const relationships = assessment.relationships.filter((item) => !impact.relationshipIds.includes(item.id))
  const answers = Object.fromEntries(Object.entries(assessment.answers).filter(([key]) => !impact.answerKeys.includes(key)))
  const threats = assessment.threats.filter((item) => !impact.threatIds.includes(item.id)).map((item) => ({ ...item, requirementIds: item.requirementIds.filter((link) => !impact.requirementIds.includes(link)), evidenceIds: item.evidenceIds.filter((link) => !impact.evidenceIds.includes(link)) }))
  const requirements = assessment.requirements.filter((item) => !impact.requirementIds.includes(item.id)).map((item) => ({ ...item, threatIds: item.threatIds.filter((link) => !impact.threatIds.includes(link)), evidenceIds: item.evidenceIds.filter((link) => !impact.evidenceIds.includes(link)) }))
  const evidence = assessment.evidence.filter((item) => !impact.evidenceIds.includes(item.id)).map((item) => ({ ...item, threatIds: item.threatIds.filter((link) => !impact.threatIds.includes(link)), requirementIds: item.requirementIds.filter((link) => !impact.requirementIds.includes(link)) }))
  return { ...assessment, components: kind === 'component' ? assessment.components.filter((item) => item.id !== id) : assessment.components, relationships, answers, threats, requirements, evidence }
}
export function reconcile(assessment: Assessment, pack: ContentPack): Assessment {
  const pinned = assessment.packs.find((item) => item.id === pack.id)
  if (pinned && (pinned.version !== pack.version || pinned.maturity !== pack.maturity)) throw new Error(`Installed pack ${pack.id} ${pack.version} does not match pinned assessment pack ${pinned.version}. Explicit migration is required.`)
  return { ...assessment, packs: [{ id: pack.id, version: pack.version, maturity: pack.maturity }], threats: evaluate(assessment, pack) }
}
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Snapshot contains an unsupported number.'); return JSON.stringify(value) }
  if (Array.isArray(value)) return `[${value.map((item) => item === undefined ? 'null' : canonical(item)).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value as Record<string, unknown>).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
  throw new Error('Snapshot contains an unsupported value.')
}
export async function prepareSnapshot(assessment: Assessment, pack: ContentPack): Promise<PreparedSnapshot> {
  const prepared = reconcile(assessment, pack)
  validateAgainstPack(validateImportedAssessment(prepared), pack)
  const bytes = canonical(prepared)
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bytes))
  const digest = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return { assessment: prepared, bytes, digest }
}
