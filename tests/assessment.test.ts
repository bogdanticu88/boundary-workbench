import { describe, expect, it } from 'vitest'
import { activeQuestions, answerKey, completeness, createAssessment, deleteWithCascade, deletionImpact, evaluate, prepareSnapshot, validateImportedAssessment, validatePack } from '../src/engine/assessment'
import { draftPack } from '../src/content/draft-pack'
import { renderReport } from '../src/reports/html'
import { indexedDB } from 'fake-indexeddb'
import { loadDraft, saveDraft } from '../src/engine/storage'

const answer = (value: 'yes' | 'no' | 'unknown' | 'not-applicable') => ({ value, updatedAt: '2026-01-01T00:00:00.000Z' })
function component(assessment: ReturnType<typeof createAssessment>, id: string, name: string) {
  assessment.components.push({ id, name, kind: 'agent', environment: 'test', dataClassification: 'internal', identity: 'declared', authority: 'declared' })
}

describe('validated scoped assessments', () => {
  it('validates recovered drafts and surfaces storage failures', async () => {
    Object.defineProperty(globalThis, 'indexedDB', { value: indexedDB, configurable: true })
    const assessment = createAssessment()
    await saveDraft(assessment)
    await expect(loadDraft()).resolves.toMatchObject({ id: assessment.id })
    const original = globalThis.indexedDB
    Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true })
    await expect(saveDraft(assessment)).rejects.toThrow()
    Object.defineProperty(globalThis, 'indexedDB', { value: original, configurable: true })
  })

  it('rejects malformed nested records and dangling relationship references', () => {
    const assessment = createAssessment()
    assessment.packs = [{ id: draftPack.id, version: draftPack.version, maturity: 'draft' }]
    assessment.components.push({ id: 'a', name: '', kind: 'not-a-kind' as never, environment: '', dataClassification: '', identity: '', authority: '' })
    expect(() => validateImportedAssessment(assessment)).toThrow('Invalid assessment')
    const valid = createAssessment()
    valid.packs = [{ id: draftPack.id, version: draftPack.version, maturity: 'draft' }]
    valid.relationships.push({ id: 'r', from: 'missing', to: 'also-missing', type: 'invokes', trustBoundary: '', intended: true })
    expect(() => validateImportedAssessment(valid)).toThrow('dangling')
    const missingRationale = createAssessment()
    missingRationale.answers[answerKey('platform', 'audit')] = answer('not-applicable')
    expect(() => validateImportedAssessment(missingRationale)).toThrow('rationale')
  })

  it('keeps unrelated agent facts separate but triggers with facts on one connected scope', () => {
    const assessment = createAssessment()
    assessment.capabilities = { 'untrusted-inputs': 'selected', 'code-execution': 'selected', credentials: 'selected' }
    component(assessment, 'one', 'Reader'); component(assessment, 'two', 'Runner')
    assessment.answers[answerKey('component:one', 'untrusted-input')] = answer('yes')
    assessment.answers[answerKey('component:two', 'code-execution')] = answer('yes')
    assessment.answers[answerKey('component:two', 'privileged-credentials')] = answer('yes')
    expect(evaluate(assessment, draftPack).find((item) => item.templateId === 'T-UNTRUSTED-EXEC' && item.scope === 'component:two')?.applicability).toBe('unresolved')
    assessment.answers[answerKey('component:two', 'untrusted-input')] = answer('yes')
    expect(evaluate(assessment, draftPack).find((item) => item.templateId === 'T-UNTRUSTED-EXEC' && item.scope === 'component:two')?.applicability).toBe('applicable')
  })

  it('uses a recorded delegate path before emitting a delegation threat', () => {
    const assessment = createAssessment()
    assessment.capabilities = { delegation: 'selected' }
    component(assessment, 'a', 'Coordinator'); component(assessment, 'b', 'Worker')
    assessment.answers[answerKey('component:a', 'delegation')] = answer('yes')
    assessment.answers[answerKey('relationship:r', 'direct-target-access')] = answer('yes')
    assessment.relationships.push({ id: 'r', from: 'a', to: 'b', type: 'delegates', trustBoundary: 'internal', intended: true })
    expect(evaluate(assessment, draftPack).find((item) => item.templateId === 'T-DELEGATION-BYPASS')?.applicability).toBe('applicable')
  })

  it('serializes valid deterministic JSON without inheriting platform answers', async () => {
    const assessment = createAssessment()
    assessment.capabilities = { memory: 'selected' }
    component(assessment, 'a', 'Caf\u00e9')
    assessment.answers[answerKey('platform', 'shared-memory')] = answer('yes')
    expect(evaluate(assessment, draftPack).find((item) => item.templateId === 'T-SHARED-CONTEXT')?.applicability).toBe('unresolved')
    const first = await prepareSnapshot(assessment, draftPack)
    const parsed = JSON.parse(first.bytes)
    expect(validateImportedAssessment(parsed).components[0].name).toBe('Caf\u00e9')
    const second = await prepareSnapshot(validateImportedAssessment(parsed), draftPack)
    expect(second.digest).toBe(first.digest)
  })

  it('calculates completeness across every scope and marks empty architecture incomplete', () => {
    const assessment = createAssessment()
    assessment.capabilities = { memory: 'selected' }
    component(assessment, 'a', 'A'); component(assessment, 'b', 'B')
    expect(completeness(assessment, draftPack).unanswered).toBeGreaterThan(0)
    expect(completeness(createAssessment(), draftPack).architectureMissing).toBe(true)
  })

  it('describes and confirms a cascade that leaves a reimportable assessment', () => {
    const assessment = createAssessment()
    component(assessment, 'a', 'Agent'); component(assessment, 'b', 'Target')
    assessment.relationships.push({ id: 'r', from: 'a', to: 'b', type: 'invokes', trustBoundary: 'test', intended: true })
    assessment.answers[answerKey('component:a', 'untrusted-input')] = answer('yes')
    assessment.answers[answerKey('relationship:r', 'direct-target-access')] = answer('yes')
    const impact = deletionImpact(assessment, 'component', 'a')
    expect(impact.relationshipIds).toEqual(['r'])
    const deleted = deleteWithCascade(assessment, 'component', 'a')
    expect(deleted.components).toHaveLength(1)
    expect(deleted.relationships).toHaveLength(0)
    expect(() => validateImportedAssessment(deleted)).not.toThrow()
  })

  it('distinguishes unknown, no, and not applicable and retains inactive answers', () => {
    const assessment = createAssessment()
    assessment.capabilities = { 'untrusted-inputs': 'selected', 'code-execution': 'selected' }
    component(assessment, 'a', 'Agent')
    const scope = 'component:a' as const
    assessment.answers[answerKey(scope, 'untrusted-input')] = answer('unknown')
    expect(activeQuestions(assessment, draftPack, scope).find((item) => item.question.id === 'code-execution')?.state).toBe('pending')
    assessment.answers[answerKey(scope, 'untrusted-input')] = answer('no')
    expect(activeQuestions(assessment, draftPack, scope).find((item) => item.question.id === 'code-execution')?.state).toBe('inactive')
    assessment.answers[answerKey(scope, 'code-execution')] = { ...answer('yes'), inactive: true }
    expect(evaluate(assessment, draftPack).find((item) => item.templateId === 'T-UNTRUSTED-EXEC' && item.scope === scope)?.applicability).not.toBe('applicable')
  })

  it('rejects invalid pack references and dependency cycles', () => {
    const broken = structuredClone(draftPack)
    broken.questions[0].dependsOn = { questionId: 'missing', equals: 'yes' }
    expect(() => validatePack(broken)).toThrow('missing question')
    const cyclic = structuredClone(draftPack)
    cyclic.questions[0].dependsOn = { questionId: cyclic.questions[1].id, equals: 'yes' }
    cyclic.questions[1].dependsOn = { questionId: cyclic.questions[0].id, equals: 'yes' }
    expect(() => validatePack(cyclic)).toThrow('cycle')
  })

  it('preserves generated treatment decisions and gives JSON and HTML one snapshot identity', async () => {
    const assessment = createAssessment()
    assessment.capabilities = { memory: 'selected' }
    component(assessment, 'a', 'Agent')
    assessment.answers[answerKey('component:a', 'shared-memory')] = answer('yes')
    const generated = evaluate(assessment, draftPack)
    generated[0].treatmentRationale = 'Review containment design.'
    assessment.threats = generated
    const snapshot = await prepareSnapshot(assessment, draftPack)
    const retained = snapshot.assessment.threats.find((item) => item.id === generated[0].id)
    expect(retained?.treatmentRationale).toBe('Review containment design.')
    const html = renderReport(snapshot, 0, 0)
    expect(snapshot.bytes).toContain(snapshot.assessment.schemaVersion)
    expect(html).toContain(snapshot.digest)
    expect(html).toContain('Review containment design.')
  })

  it('escapes report-controlled content and retains legacy answers as platform declarations', async () => {
    const legacy = { ...createAssessment(), schemaVersion: '1.0', capabilities: ['audit'], answers: { audit: answer('yes') }, packs: [] }
    const migrated = validateImportedAssessment(legacy)
    expect(migrated.answers[answerKey('platform', 'audit')]).toBeDefined()
    migrated.evidence.push({ id: 'e1', type: 'owner-declaration', reference: '<script>alert(1)</script>', scope: 'test', date: '2026-01-01', assessmentRevision: 1, origin: 'test', requirementIds: [], threatIds: [] })
    const snapshot = await prepareSnapshot({ ...migrated, title: '<img src=x onerror=alert(1)>' }, draftPack)
    const html = renderReport(snapshot, 0, 0)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
