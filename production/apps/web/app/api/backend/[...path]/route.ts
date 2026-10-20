import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
const allowed = /^(me|cities|bookings|drivers|drivers\/(availability|profile)|drivers\/[0-9a-f-]{36}\/approval|bookings\/[0-9a-f-]{36}\/(assign|start-code|status))$/;
async function forward(req:NextRequest,context:{params:Promise<{path:string[]}>}) {
  const path=(await context.params).path.join('/');
  if(!allowed.test(path))return new Response(null,{status:404});
  if(!['GET','POST','PATCH'].includes(req.method))return new Response(null,{status:405});
  if(req.method!=='GET' && req.headers.get('origin')!==new URL(process.env.NEXTAUTH_URL!).origin)return new Response(null,{status:403});
  const token=await getToken({req,secret:process.env.NEXTAUTH_SECRET});
  if(!token?.apiToken||Number(token.apiExpiresAt||0)*1000<Date.now())return Response.json({message:'Please sign in again'},{status:401});
  const body=req.method==='GET'?undefined:await req.text();
  if(body && Buffer.byteLength(body)>16384)return new Response(null,{status:413});
  try {
    const response=await fetch(`${process.env.DRIOZ_API_ORIGIN}/${path}`,{method:req.method,body,headers:{Authorization:`Bearer ${token.apiToken}`,...(body?{'Content-Type':'application/json'}:{})},cache:'no-store',signal:AbortSignal.timeout(10000)});
    return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  } catch {return Response.json({message:'Service temporarily unavailable'},{status:503});}
}
export {forward as GET,forward as POST,forward as PATCH};
