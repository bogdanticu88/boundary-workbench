import type {Assessment} from './types'
import {draftPack} from '../content/draft-pack'
import {reconcile,validateImportedAssessment,validateAgainstPack} from './assessment'
export const needsContentUpgrade=(a:Assessment)=>a.packs.some(p=>p.id===draftPack.id&&p.version==='0.1.0')
export function upgradeContent(a:Assessment):Assessment {
 if(!needsContentUpgrade(a))return validateAgainstPack(a,draftPack)
 const staged={...structuredClone(a),applicationVersion:'0.2.0',revision:a.revision+1,updatedAt:new Date().toISOString(),packs:[{id:draftPack.id,version:draftPack.version,maturity:draftPack.maturity}],answers:Object.fromEntries(Object.entries(a.answers).map(([k,v])=>[k,{...v,needsReview:true}]))}
 const current=reconcile(staged,draftPack);const retained=new Set(current.threats.map(t=>t.id));current.threats.push(...a.threats.filter(t=>!retained.has(t.id)).map(t=>({...t,manual:true,needsReview:true})));current.threats=current.threats.map(t=>({...t,needsReview:true}));return validateAgainstPack(validateImportedAssessment(current),draftPack)
}
