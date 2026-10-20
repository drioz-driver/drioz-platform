export function canUsePartner(role:string,_hasDriver:boolean){return role==='driver'||['admin','operator'].includes(role)}
export function canUseOperations(role:string){return ['admin','operator','finance','support'].includes(role)}
export function allowedWorkspace(requested:string,role:string,hasDriver:boolean){
 if(role==='driver'&&(requested==='customer'||requested==='admin'||!['driver','support','notifications','account'].includes(requested)))return 'driver';
 if(requested==='driver'&&!canUsePartner(role,hasDriver))return 'customer';
 if(requested==='admin'&&!canUseOperations(role))return 'customer';
 return ['customer','driver','admin','support','notifications','account'].includes(requested)?requested:'customer';
}
