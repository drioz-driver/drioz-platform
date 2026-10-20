import { runtime as getRuntime } from '@/lib/runtime';
import {z} from 'zod';
import {authContext,providerStatus,type AuthRuntime} from '@/lib/auth/server';
import {safeReturnTo} from '@/lib/auth/identity';
import {consumeRecovery,recoveryCookie} from '@/lib/auth/recovery';
import {throttle} from '@/lib/auth/rate-limit';
export const dynamic='force-dynamic';
const email=z.string().trim().email().max(254).transform(v=>v.toLowerCase()),password=z.string().min(12).max(128),phone=z.string().regex(/^\+[1-9]\d{7,14}$/,'Use a country code and valid mobile number');
async function route(request:Request,context:{params:Promise<{action:string}>}){
 const env=getRuntime();
 const runtime=env as unknown as AuthRuntime&{DB:D1Database};const auth=authContext(request,runtime),action=(await context.params).action;const json=(body:unknown,status=200)=>auth.apply(Response.json(body,{status}));
 try{
  if(request.method==='GET'){
   if(action==='config')return json({...await providerStatus(runtime),platformPreview:!!runtime.ALLOW_PLATFORM_IDENTITY});
   if(action==='session'){const user=await auth.identity();return json({authenticated:!!user,provider:user?.provider||null})}
   if(action==='preview'){if(!runtime.ALLOW_PLATFORM_IDENTITY||!request.headers.get('oai-authenticated-user-id'))return auth.apply(Response.redirect(new URL('/signin-with-chatgpt?return_to=%2F',request.url),303));auth.choose('platform');return auth.apply(Response.redirect(new URL(safeReturnTo(new URL(request.url).searchParams.get('next')),request.url),303))}
   if(action==='google'){
    if(!auth.client)return json({message:'Google sign-in needs authentication service configuration.'},503);
    await throttle(runtime.DB,request,'google');auth.choose('external');const next=safeReturnTo(new URL(request.url).searchParams.get('next'));const {data,error}=await auth.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL('/auth/callback?next='+encodeURIComponent(next),request.url).toString(),skipBrowserRedirect:true}});if(error||!data.url)return json({message:'Google sign-in is not available yet.'},503);return auth.apply(Response.redirect(data.url,303));
   }
   return json({message:'Not found'},404);
  }
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({message:'Request origin mismatch'},403);
  if(Number(request.headers.get('content-length')||0)>8192)return json({message:'Request too large'},413);
  const raw=await request.text();if(raw.length>8192)return json({message:'Request too large'},413);let body:any;try{body=JSON.parse(raw)}catch{return json({message:'Invalid request'},400)}
  if(action==='signout'){
   if(auth.client)await auth.client.auth.signOut({scope:body.all?'global':'local'});auth.clear();return json({ok:true});
  }
  if(!auth.client)return json({message:'DRIOZ account sign-in is awaiting authentication provider setup. Private preview access remains available.'},503);
  if(action==='login'){
   const d=z.object({email,password:z.string().min(1).max(128)}).strict().parse(body);await throttle(runtime.DB,request,'login',d.email);const {data,error}=await auth.client.auth.signInWithPassword(d);if(error||!managedUser(data.user))return json({message:'Unable to sign in. Check your details and verify your email.'},401);auth.choose('external');return json({ok:true});
  }
  if(action==='signup'){
   const d=z.object({email,password,name:z.string().trim().min(2).max(80),intent:z.enum(['customer','driver'])}).strict().parse(body);await throttle(runtime.DB,request,'signup',d.email);const {error}=await auth.client.auth.signUp({email:d.email,password:d.password,options:{emailRedirectTo:new URL('/auth/callback',request.url).toString(),data:{full_name:d.name,account_intent:d.intent}}});if(error)return json({message:'Registration could not be completed. Try again later or use sign-in if you already have an account.'},400);auth.choose('external');return json({message:'Check your email to confirm your account. If you already have an account, use sign-in or password recovery.'});
  }
  if(action==='phone-send'){
   const d=z.object({phone}).strict().parse(body);await throttle(runtime.DB,request,action,d.phone);const {error}=await auth.client.auth.signInWithOtp({phone:d.phone,options:{shouldCreateUser:true}});if(error)return json({message:'Unable to send a code. Check the number or try again later.'},400);auth.choose('external');return json({message:'Code requested. Enter the SMS code when it arrives.'});
  }
  if(action==='phone-verify'){
   const d=z.object({phone,code:z.string().regex(/^\d{6}$/)}).strict().parse(body);await throttle(runtime.DB,request,action,d.phone);const {data,error}=await auth.client.auth.verifyOtp({phone:d.phone,token:d.code,type:'sms'});if(error||!managedUser(data.user))return json({message:'The code is invalid or expired. Request another code.'},401);auth.choose('external');return json({ok:true});
  }
  if(action==='resend'){const d=z.object({email}).strict().parse(body);await throttle(runtime.DB,request,action,d.email);await auth.client.auth.resend({type:'signup',email:d.email,options:{emailRedirectTo:new URL('/auth/callback',request.url).toString()}});return json({message:'If confirmation is needed, an email will arrive shortly. Open it in this browser.'})}
  if(action==='recover'){
   const d=z.object({email}).strict().parse(body);await throttle(runtime.DB,request,action,d.email);await auth.client.auth.resetPasswordForEmail(d.email,{redirectTo:new URL('/auth/callback?next=%2Freset-password',request.url).toString()});return json({message:'If this address has an account, a password-reset email will arrive shortly. Open it in this browser.'});
  }
  if(action==='reset-password'){
   const d=z.object({password}).strict().parse(body);const {data,error}=await auth.client.auth.getUser();if(error||!managedUser(data.user))return json({message:'Open a valid recovery link before setting your password.'},401);await throttle(runtime.DB,request,action,data.user.id);if(!await consumeRecovery(runtime.DB,data.user.id,auth.cookie(recoveryCookie)))return json({message:'Open a new recovery link before changing your password.'},401);auth.setCookie(recoveryCookie,'',{maxAge:0});const result=await auth.client.auth.updateUser({password:d.password});if(result.error)return json({message:'Unable to update your password. Request a new recovery link.'},400);auth.choose('external');return json({ok:true});
  }
  return json({message:'Not found'},404);
 }catch(e){if(e instanceof z.ZodError)return json({message:e.issues.map(x=>x.message).join('. ')},400);return json({message:'Unable to complete sign-in right now. Please wait and try again.'},429)}
}
function managedUser(user:any){return !!user?.id&&!!(user.email_confirmed_at||user.phone_confirmed_at)}
export {route as GET,route as POST};
