/** Builds operations() options from server environment variables (Vercel project settings). */
import {createNotifier,type NotifierRuntime} from './notify.ts';
import type {KycRuntime} from './kyc.ts';
import type {OperationsOptions} from './operations.ts';
export type DriozRuntime=NotifierRuntime&KycRuntime&{DRIOZ_GSTIN?:string;DRIOZ_LEGAL_NAME?:string;DRIOZ_ADDRESS?:string;DRIOZ_SAC?:string;DRIOZ_SOS_PHONE?:string};
export function runtimeOptions(env:DriozRuntime):OperationsOptions{
 return {notifier:createNotifier(env),kyc:{IDFY_ACCOUNT_ID:env.IDFY_ACCOUNT_ID,IDFY_API_KEY:env.IDFY_API_KEY},sosPhone:env.DRIOZ_SOS_PHONE||undefined,
  seller:{legalName:env.DRIOZ_LEGAL_NAME,gstin:env.DRIOZ_GSTIN,address:env.DRIOZ_ADDRESS,sac:env.DRIOZ_SAC}};
}
