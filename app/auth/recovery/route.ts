import { runtime as getRuntime } from '@/lib/runtime';
import {authContext,type AuthRuntime} from '@/lib/auth/server';
import {createRecovery,recoveryCookie} from '@/lib/auth/recovery';

export const dynamic='force-dynamic';
const validToken=(value:unknown):value is string=>typeof value==='string'&&/^[a-zA-Z0-9_-]{32,256}$/.test(value);
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const invalid=()=>new Response('This reset link is invalid or expired. Request a new one at drioz.com/forgot-password.',{status:400,headers});

export async function GET(request:Request){
 const token=new URL(request.url).searchParams.get('token_hash');
 if(!validToken(token))return invalid();
 return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reset your DRIOZ password</title><main style="max-width:420px;margin:12vh auto;padding:24px;font-family:system-ui;color:#10271e"><img src="/drioz-logo.png" alt="DRIOZ" width="132"><h1>Reset your password</h1><p>Continue to choose a new password for your DRIOZ account.</p><form method="post" action="/auth/recovery"><input type="hidden" name="token_hash" value="${token}"><button style="padding:12px 20px;border:0;border-radius:8px;background:#047857;color:white">Continue to reset password</button></form></main></html>`,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});
}

export async function POST(request:Request){
 const origin=new URL(request.url).origin;
 if(request.headers.get('origin')!==origin)return invalid();
 try{
  const token=(await request.formData()).get('token_hash');
  if(!validToken(token))return invalid();
  const env=getRuntime();
  const auth=authContext(request,env as unknown as AuthRuntime);
  if(!auth.client)return invalid();
  const {data,error}=await auth.client.auth.verifyOtp({type:'recovery',token_hash:token});
  if(error||!data.user||!data.session)return invalid();
  auth.setCookie(recoveryCookie,await createRecovery(env.DB,data.user.id),{maxAge:600});
  auth.choose('external');
  return auth.apply(new Response(null,{status:303,headers:{...headers,Location:'/reset-password'}}));
 }catch{return invalid()}
}
