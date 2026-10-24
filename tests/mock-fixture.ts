import { createAssessment, answerKey, reconcile } from '../src/engine/assessment'
import { draftPack } from '../src/content/draft-pack'
import type { AnswerValue, Assessment } from '../src/engine/types'
export function mockAssessment(): Assessment {
 const a=createAssessment(); a.id='mock-orion-001'; a.revision=40;
 a.title='FICTIONAL - Orion Agent Platform';
 a.scope='Mock acceptance exercise only. A central harness delegates to a read-only PR reviewer and a sandbox security-testing agent. All systems, identities and evidence are fictional. No scanning is performed.';
 a.assumptions='Design-stage declarations only. Azure sandbox, synthetic repositories and targets. The PR reviewer cannot execute code; the testing agent can execute code with a scoped sandbox credential.';
 a.exclusions='No production access, real customer data, real targets, or regulatory compliance conclusion.';
 a.components=[
 {id:'harness',name:'Central Harness',kind:'harness',environment:'Azure DEV',dataClassification:'Synthetic internal',identity:'mi-orion-harness',authority:'Delegate sandbox tasks'},
 {id:'reviewer',name:'PR Review Agent',kind:'agent',environment:'Azure DEV',dataClassification:'Synthetic source',identity:'mi-orion-reviewer',authority:'Read code and draft comments'},
 {id:'tester',name:'Sandbox Test Agent',kind:'agent',environment:'Isolated DEV',dataClassification:'Synthetic findings',identity:'mi-orion-tester',authority:'Test allowlisted mock targets'},
 {id:'repo',name:'Mock Repository',kind:'repository',environment:'GitHub fixture',dataClassification:'Public fictional code',identity:'GitHub fixture app',authority:'Source only'},
 {id:'target',name:'Mock API Target',kind:'target',environment:'Isolated DEV',dataClassification:'Synthetic API data',identity:'Sandbox identity',authority:'Receive authorised mock tests'}];
 a.relationships=[
 {id:'delegate-review',from:'harness',to:'reviewer',type:'delegates',trustBoundary:'Harness to read-only worker',intended:true},
 {id:'delegate-test',from:'harness',to:'tester',type:'delegates',trustBoundary:'Harness to test sandbox',intended:true},
 {id:'read-repo',from:'reviewer',to:'repo',type:'reads',trustBoundary:'Untrusted repository content',intended:true},
 {id:'invoke-target',from:'tester',to:'target',type:'invokes',trustBoundary:'Sandbox egress boundary',intended:true}];
 a.capabilities=Object.fromEntries(['delegation','untrusted-inputs','code-execution','credentials','memory','writes','egress','recovery','audit'].map(k=>[k,'selected']));
 const put=(s:any,q:string,value:AnswerValue)=>{a.answers[answerKey(s,q)]={value,updatedAt:a.updatedAt}};
 for(const c of a.components){const s=`component:${c.id}`; for(const q of draftPack.questions.filter(q=>q.scope==='component'))put(s,q.id,'no');put(s,'revocation','yes')}
 put('platform','audit','unknown');put('component:harness','delegation','yes');
 put('component:reviewer','untrusted-input','yes');put('component:reviewer','code-execution','no');put('component:reviewer','egress','yes');
 put('component:tester','untrusted-input','yes');put('component:tester','code-execution','yes');put('component:tester','privileged-credentials','yes');put('component:tester','external-write','yes');put('component:tester','egress','yes');put('component:tester','revocation','unknown');
 for(const r of a.relationships)put(`relationship:${r.id}`,'direct-target-access',r.id==='delegate-test'?'yes':'no');
 const ready=reconcile(a,draftPack);const t=ready.threats.find(t=>t.id==='T-UNTRUSTED-EXEC:component:tester')!;
 t.disposition='mitigation-proposed';t.treatmentRationale='Separate test execution from privileged credentials; no assertion of implemented protection.';t.requirementIds=['REQ-ISO'];t.evidenceIds=['EV-DESIGN'];
 ready.requirements=[{id:'REQ-ISO',title:'Isolate test execution credentials',acceptanceCriteria:'A synthetic malicious test cannot read the broker credential or contact an out-of-scope target.',owner:'Fictional Platform Team',scope:'component:tester',status:'proposed',threatIds:[t.id],evidenceIds:['EV-DESIGN']}];
 ready.evidence=[{id:'EV-DESIGN',type:'owner-declaration',reference:'MOCK architecture note: isolated sandbox planned; not implemented or verified.',scope:'component:tester',date:'2026-10-24',assessmentRevision:40,origin:'Fictional acceptance fixture',requirementIds:['REQ-ISO'],threatIds:[t.id]}];
 ready.threats.push({id:'MAN-TARGET',scope:'component:tester',title:'Mock target scope escape',scenario:'UNIQUE-SCENARIO: a synthetic redirect moves a test request beyond the authorised sandbox target.',applicability:'applicable',triggeringFacts:['Fictional reviewer-authored scenario'],disposition:'open',manual:true,requirementIds:[],evidenceIds:[]});
 return ready;
}
