import {createServerClient,parseCookieHeader,serializeCookieHeader,type CookieOptions} from '@supabase/ssr';
import {recoveryCookie} from './recovery.ts';
import {managedIdentity,platformIdentity} from './identity.ts';
export type AuthRuntime={SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};
const cookieName='__Host-drioz-auth',modeName='__Host-drioz-mode';
export function authContext(request:Request,runtime:AuthRuntime,clientFactory:any=createServerClient){
 const incoming=parseCookieHeader(request.headers.get('cookie')||'').map(c=>({name:c.name,value:c.value||''}));const values=new Map(incoming.map(c=>[c.name,c.value]));const outgoing=new Map<string,string>();
 const options:CookieOptions={path:'/',secure:true,httpOnly:true,sameSite:'lax',maxAge:604800};
 function set(name:string,value:string,opts:CookieOptions={}){values.set(name,value);outgoing.set(name,serializeCookieHeader(name,value,{...options,...opts,secure:true,httpOnly:true,path:'/',domain:undefined}))}
 const configured=!!runtime.SUPABASE_URL&&!!runtime.SUPABASE_PUBLISHABLE_KEY;
 const client=configured?clientFactory(runtime.SUPABASE_URL!,runtime.SUPABASE_PUBLISHABLE_KEY!,{cookieOptions:{...options,name:cookieName},cookies:{getAll:()=>Array.from(values,([name,value])=>({name,value})),setAll:(cookies:{name:string;value:string;options:CookieOptions}[])=>{cookies.forEach(c=>set(c.name,c.value,c.options))}}}):null;
 return {client,configured,cookie:(name:string)=>values.get(name)||'',setCookie:set,choose:(mode:'external'|'platform')=>set(modeName,mode),clear(){for(const key of values.keys())if(key.startsWith(cookieName))set(key,'',{maxAge:0});set(recoveryCookie,'',{maxAge:0});set(modeName,'external')},
 async identity(){if(values.get(modeName)!=='platform'&&client){const {data,error}=await client.auth.getUser();if(!error){const user=managedIdentity(data.user);if(user)return user}}if(values.get(modeName)==='external')return null;return platformIdentity(request)},
 apply(response:Response){const h=new Headers(response.headers);h.set('Cache-Control','private, no-store, max-age=0');h.set('Pragma','no-cache');h.set('Expires','0');h.set('Vary','Cookie');h.set('X-Content-Type-Options','nosniff');for(const value of outgoing.values())h.append('Set-Cookie',value);return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h})}};
}
export async function providerStatus(runtime:AuthRuntime){if(!runtime.SUPABASE_URL||!runtime.SUPABASE_PUBLISHABLE_KEY)return {configured:false,email:false,phone:false,google:false};try{const r=await fetch(runtime.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/settings',{headers:{apikey:runtime.SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(8000),cache:'no-store'});if(!r.ok)throw Error();const data:any=await r.json();return {configured:true,email:!!data.external?.email,phone:!!data.external?.phone,google:!!data.external?.google}}catch{return {configured:true,email:false,phone:false,google:false,unavailable:true}}}
