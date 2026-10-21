import {runtime} from './runtime';
import {authContext,AuthUnavailableError,type AuthRuntime} from './auth/server';
import {mobileIdentity} from './mobile-api';
import {operations,ApiError} from './operations';
import {paymentService} from './payments';
export async function paymentRoute(request:Request,path:string){
 const env=runtime(),auth=authContext(request,env as AuthRuntime);
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie, Authorization'};
 const respond=(data:any,status=200)=>auth.apply(Response.json(data,{status,headers}));
 try{
  if(!env.DB)throw new ApiError(503,'Payment database is unavailable.');
  const service=paymentService(env.DB,env);
  if(path==='webhook'){
   if(request.method!=='POST')throw new ApiError(405,'Method not allowed.');
   const body=await request.text();if(body.length>1000000)throw new ApiError(413,'Webhook too large.');
   return respond(await service.webhook(body,request.headers.get('x-razorpay-signature')||''));
  }
  const bearer=request.headers.has('authorization');
  const identity=bearer?await mobileIdentity(request,env):await auth.identity();
  if(!identity)throw new ApiError(401,'Sign in to DRIOZ to continue.');
  const ops=operations(env.DB,env.BUCKET,env.DRIOZ_OWNER_EMAIL||'',env.TRIP_PIN_SECRET||'');
  const actor=await ops.actor(identity);
  if(request.method==='GET'&&path==='wallet')return respond(await service.wallet(actor));
  if(request.method!=='POST')throw new ApiError(405,'Method not allowed.');
  if(!bearer&&request.headers.get('origin')!==new URL(request.url).origin)throw new ApiError(403,'Request origin mismatch.');
  await ops.limit(actor);
  const text=await request.text();if(text.length>10000)throw new ApiError(413,'Request too large.');
  let data:any;try{data=JSON.parse(text)}catch{throw new ApiError(400,'Invalid JSON.');}
  if(path==='create-order')return respond(await service.create(actor,data));
  if(path==='verify-payment')return respond(await service.verify(actor,data));
  if(path==='wallet/pay')return respond(await service.payWallet(actor,data));
  if(path==='wallet/reconcile')return respond(await service.reconcile(actor));
  throw new ApiError(404,'Payment endpoint not found.');
 }catch(e){if(e instanceof ApiError)return respond({message:e.message},e.status);if(e instanceof AuthUnavailableError)return respond({message:e.message},503);return respond({message:'Unable to confirm payment yet. Check payment status before retrying, or contact support.'},500)}
}
