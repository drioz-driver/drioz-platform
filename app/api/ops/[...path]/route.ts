import { runtime as getRuntime } from '@/lib/runtime';
import {authContext,AuthUnavailableError,type AuthRuntime} from '@/lib/auth/server';
import {operations,ApiError} from '@/lib/operations';
import {runtimeOptions,type DriozRuntime} from '@/lib/runtime-options';
import {databaseOutOfDate,MIGRATIONS_PENDING} from '@/lib/migrations-pending';
export const dynamic='force-dynamic';
async function route(request:Request,context:{params:Promise<{path:string[]}>}){
 const env=getRuntime();
 const auth=authContext(request,env as unknown as AuthRuntime);
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 try{
  const runtime=env as unknown as {DB:D1Database;BUCKET:R2Bucket;DRIOZ_OWNER_EMAIL?:string;TRIP_PIN_SECRET?:string;GOOGLE_MAPS_BROWSER_KEY?:string;RAZORPAY_KEY_ID?:string};
  if(!runtime.DB)throw new ApiError(503,'Database unavailable');
  const options=runtimeOptions(env as unknown as DriozRuntime);
  const ops=operations(runtime.DB,runtime.BUCKET,runtime.DRIOZ_OWNER_EMAIL||'',runtime.TRIP_PIN_SECRET||'',runtime.RAZORPAY_KEY_ID,true,options);
  const path=(await context.params).path.join('/');
  if(path==='health'&&request.method==='GET'){await runtime.DB.prepare('SELECT id FROM users LIMIT 1').all();return Response.json({status:'ready',database:'connected',documents:!!runtime.BUCKET},{headers})}
  // Family share links are public by design: unguessable 256-bit token, 24-hour expiry, status + live location only.
  if(request.method==='GET'&&path==='share')return auth.apply(Response.json(await ops.share(new URL(request.url).searchParams.get('token')||''),{headers}));
  const identity=await auth.identity();
  if(!identity)throw new ApiError(401,'Sign in to DRIOZ to continue');
  const actor=await ops.actor(identity);
  let data:any=null;
  if(request.method==='POST'){
   if(request.headers.get('origin')!==new URL(request.url).origin)throw new ApiError(403,'Request origin mismatch');
   await ops.limit(actor);
   const contentType=request.headers.get('content-type')||'';
   // Vercel functions accept ~4.5 MB request bodies; apps compress inspection photos before upload.
   const maximum=contentType.startsWith('multipart/form-data')?(path.endsWith('/inspection')?4400000:6*1024*1024):20000;
   if(Number(request.headers.get('content-length')||0)>maximum)throw new ApiError(413,'Request too large');
   if(contentType.startsWith('multipart/form-data')){const reader=request.body?.getReader();let length=0;const chunks:Uint8Array[]=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maximum){await reader.cancel();throw new ApiError(413,'Request too large')}chunks.push(value)}}request=new Request(request.url,{method:'POST',headers:request.headers,body:new Blob(chunks as BlobPart[])});
   }else{const text=await request.text();if(text.length>maximum)throw new ApiError(413,'Request too large');try{data=JSON.parse(text)}catch{throw new ApiError(400,'Invalid JSON')}}
  }
  const snapshotDb=runtime.DB as unknown as {readSnapshot?: (work:(db:any)=>Promise<any>)=>Promise<any>};
  const result=path==='snapshot'&&request.method==='GET'&&snapshotDb.readSnapshot
    ? await snapshotDb.readSnapshot(db=>operations(db,runtime.BUCKET,runtime.DRIOZ_OWNER_EMAIL||'',runtime.TRIP_PIN_SECRET||'',runtime.RAZORPAY_KEY_ID,true,options).handle(actor,path,request.method,data,request))
    : await ops.handle(actor,path,request.method,data,request);
  if(path==='snapshot'&&result.integrations&&runtime.GOOGLE_MAPS_BROWSER_KEY)result.integrations.maps='Google address search and driving route estimates connected';
  return auth.apply(result instanceof Response?result:Response.json(result,{headers}));
 }catch(e){if(e instanceof AuthUnavailableError)return auth.apply(Response.json({message:e.message},{status:503,headers}));if(e instanceof ApiError)return auth.apply(Response.json({message:e.message},{status:e.status,headers}));console.error('operations request failed',e instanceof Error?e.message:'Unknown error');if(databaseOutOfDate(e))return auth.apply(Response.json(MIGRATIONS_PENDING,{status:503,headers}));return auth.apply(Response.json({message:'Unable to complete the request. Refresh and try again.'},{status:500,headers}));}
}
export {route as GET,route as POST};
