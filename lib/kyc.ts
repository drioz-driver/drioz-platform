/**
 * Automated driving-licence verification through IDfy (ind_driving_license,
 * verify_with_source). Opt-in: set IDFY_ACCOUNT_ID and IDFY_API_KEY.
 * The result supports — it never replaces — the operations review: approval
 * still requires the three evidence documents to be approved by staff.
 */
export type KycRuntime={IDFY_ACCOUNT_ID?:string;IDFY_API_KEY?:string};
export type KycResult={status:'verified'|'mismatch'|'not_found'|'error';summary:string;checkedAt:number;validTo?:string|null;nameOnLicence?:string|null};

export function kycConfigured(env:KycRuntime){return !!env.IDFY_ACCOUNT_ID&&!!env.IDFY_API_KEY}

export async function verifyLicence(env:KycRuntime,input:{licence:string;dateOfBirth:string;name:string},fetcher:typeof fetch=fetch):Promise<KycResult>{
 const checkedAt=Date.now();
 if(!kycConfigured(env))return {status:'error',summary:'Automated verification is not configured',checkedAt};
 try{
  const r=await fetcher('https://eve.idfy.com/v3/tasks/sync/verify_with_source/ind_driving_license',{method:'POST',headers:{'Content-Type':'application/json','account-id':env.IDFY_ACCOUNT_ID!,'api-key':env.IDFY_API_KEY!},
   body:JSON.stringify({task_id:crypto.randomUUID(),group_id:crypto.randomUUID(),data:{id_number:input.licence.replace(/\s/g,'').toUpperCase(),date_of_birth:input.dateOfBirth}}),signal:AbortSignal.timeout(15000)});
  const body:any=await r.json().catch(()=>({}));
  if(!r.ok)return {status:'error',summary:`Provider returned ${r.status}`,checkedAt};
  const out=body?.result?.source_output;
  if(!out||out.status==='id_not_found')return {status:'not_found',summary:'Licence not found at source (Parivahan)',checkedAt};
  const nameOnLicence=out.name||null,validTo=out.nt_validity_to||out.t_validity_to||null;
  const wanted=input.name.toLowerCase().split(/\s+/).filter(Boolean),got=String(nameOnLicence||'').toLowerCase();
  const nameMatches=wanted.length>0&&wanted.some(w=>w.length>2&&got.includes(w));
  return {status:nameMatches?'verified':'mismatch',summary:nameMatches?'Licence found and name matches':'Licence found but the name does not match the partner profile',checkedAt,validTo,nameOnLicence};
 }catch(e){return {status:'error',summary:e instanceof Error?e.message:'Verification failed',checkedAt}}
}
