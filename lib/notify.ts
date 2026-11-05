/**
 * Outbound alerts: Expo push (both apps) and MSG91 SMS / WhatsApp.
 *
 * Everything here is opt-in through runtime settings and fails soft: a provider
 * outage never blocks a booking or a trip transition. Configure:
 *   PUSH_ENABLED=true            (+ optional EXPO_ACCESS_TOKEN for enhanced security)
 *   MSG91_AUTH_KEY, MSG91_SMS_TEMPLATES (JSON {event: flowTemplateId})
 *   MSG91_WHATSAPP_NUMBER, MSG91_WHATSAPP_TEMPLATES (JSON {event: templateName})
 * Indian SMS requires DLT-registered templates; WhatsApp requires Meta-approved templates.
 */
export type AppName='customer'|'partner';
export type PushMessage={to:string;title:string;body:string;data?:Record<string,unknown>;priority?:'default'|'high';channelId?:string;sound?:'default'|null};
export type MessageEvent='assigned'|'arrived'|'started'|'completed'|'cancelled'|'running_late'|'sos';
export type NotifierRuntime={PUSH_ENABLED?:string;EXPO_ACCESS_TOKEN?:string;MSG91_AUTH_KEY?:string;MSG91_SMS_TEMPLATES?:string;MSG91_WHATSAPP_NUMBER?:string;MSG91_WHATSAPP_TEMPLATES?:string};
export type Notifier={
 push:(messages:PushMessage[])=>Promise<{invalidTokens:string[]}>;
 text:(phone:string,event:MessageEvent,vars:Record<string,string>)=>Promise<void>;
 status:()=>{push:boolean;sms:boolean;whatsapp:boolean};
};

const json=(value:string|undefined)=>{try{return value?JSON.parse(value) as Record<string,string>:{}}catch{return {}}};
const indianMobile=(phone:string)=>{const digits=phone.replace(/\D/g,'');if(digits.length===10)return '91'+digits;if(digits.length===12&&digits.startsWith('91'))return digits;return digits.length>=11?digits:''};

export const silentNotifier:Notifier={push:async()=>({invalidTokens:[]}),text:async()=>{},status:()=>({push:false,sms:false,whatsapp:false})};

export function createNotifier(env:NotifierRuntime,fetcher:typeof fetch=fetch):Notifier{
 const pushOn=env.PUSH_ENABLED==='true';
 const smsTemplates=json(env.MSG91_SMS_TEMPLATES),waTemplates=json(env.MSG91_WHATSAPP_TEMPLATES);
 const smsOn=!!env.MSG91_AUTH_KEY&&Object.keys(smsTemplates).length>0;
 const waOn=!!env.MSG91_AUTH_KEY&&!!env.MSG91_WHATSAPP_NUMBER&&Object.keys(waTemplates).length>0;
 async function push(messages:PushMessage[]){
  const invalidTokens:string[]=[];
  if(!pushOn||!messages.length)return {invalidTokens};
  for(let i=0;i<messages.length;i+=100){
   const chunk=messages.slice(i,i+100);
   try{
    const r=await fetcher('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(env.EXPO_ACCESS_TOKEN?{Authorization:'Bearer '+env.EXPO_ACCESS_TOKEN}:{})},body:JSON.stringify(chunk.map(m=>({sound:'default',priority:'high',...m}))),signal:AbortSignal.timeout(4000)});
    const body:any=await r.json().catch(()=>({}));
    (body.data||[]).forEach((ticket:any,n:number)=>{if(ticket?.details?.error==='DeviceNotRegistered')invalidTokens.push(chunk[n].to)});
   }catch(e){console.error('push delivery failed',e instanceof Error?e.message:'unknown')}
  }
  return {invalidTokens};
 }
 async function text(phone:string,event:MessageEvent,vars:Record<string,string>){
  const mobile=indianMobile(phone);if(!mobile)return;
  const jobs:Promise<unknown>[]=[];
  if(smsOn&&smsTemplates[event])jobs.push(fetcher('https://control.msg91.com/api/v5/flow',{method:'POST',headers:{authkey:env.MSG91_AUTH_KEY!,'Content-Type':'application/json',accept:'application/json'},body:JSON.stringify({template_id:smsTemplates[event],short_url:'0',recipients:[{mobiles:mobile,...vars}]}),signal:AbortSignal.timeout(4000)}));
  if(waOn&&waTemplates[event]){
   const components=Object.fromEntries(Object.values(vars).map((value,i)=>[`body_${i+1}`,{type:'text',value}]));
   jobs.push(fetcher('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',{method:'POST',headers:{authkey:env.MSG91_AUTH_KEY!,'Content-Type':'application/json'},body:JSON.stringify({integrated_number:env.MSG91_WHATSAPP_NUMBER,content_type:'template',payload:{messaging_product:'whatsapp',type:'template',template:{name:waTemplates[event],language:{code:'en',policy:'deterministic'},to_and_components:[{to:[mobile],components}]}}}),signal:AbortSignal.timeout(4000)}));
  }
  const results=await Promise.allSettled(jobs);results.forEach(r=>{if(r.status==='rejected')console.error('message delivery failed',event)});
 }
 return {push,text,status:()=>({push:pushOn,sms:smsOn,whatsapp:waOn})};
}
