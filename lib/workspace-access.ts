/**
 * DRIOZ has two separate web experiences:
 *  - the customer site at `/`        → booking, support, inbox, account (+ Operations for staff)
 *  - the partner portal at `/partner` → driver workspace, support, inbox, account
 * Customers never see partner screens, and driver accounts never see booking screens.
 * Staff (admin/operator) can open both to check the workflows.
 */
export type Portal='customer'|'partner';
export const customerViews=['customer','admin','support','notifications','account'];
export const partnerViews=['driver','support','notifications','account'];
export function canUsePartner(role:string,_hasDriver:boolean){return role==='driver'||['admin','operator'].includes(role)}
export function canUseOperations(role:string){return ['admin','operator','finance','support'].includes(role)}
/** Which portal an account belongs on when it lands on the other one. */
export function homePortal(role:string):Portal{return role==='driver'?'partner':'customer'}
export function allowedWorkspace(requested:string,role:string,_hasDriver:boolean,portal:Portal='customer'){
 if(portal==='partner')return canUsePartner(role,_hasDriver)?(partnerViews.includes(requested)?requested:'driver'):'customer';
 if(requested==='admin')return canUseOperations(role)?'admin':'customer';
 return customerViews.includes(requested)?requested:'customer';
}
