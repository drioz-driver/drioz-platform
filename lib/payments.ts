import Razorpay from 'razorpay';
import {driverAccount,driverWallet} from './driver-wallet.ts';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {ApiError} from './operations.ts';
export type PaymentConfig={RAZORPAY_KEY_ID?:string;RAZORPAY_KEY_SECRET?:string;RAZORPAY_WEBHOOK_SECRET?:string;RAZORPAYX_KEY_ID?:string;RAZORPAYX_KEY_SECRET?:string;RAZORPAYX_ACCOUNT_NUMBER?:string};
type Actor={id:string};
const uuid=()=>crypto.randomUUID();
const orderInput=z.object({purpose:z.enum(['topup','booking','driver_topup']).default('topup'),amount:z.number().int().min(100).max(1000000).optional(),currency:z.literal('INR').default('INR'),receipt:z.string().max(40).optional(),bookingId:z.string().max(100).optional(),key:z.string().uuid().optional()}).strict();
const proofInput=z.object({razorpay_order_id:z.string().regex(/^order_[a-zA-Z0-9]+$/),razorpay_payment_id:z.string().regex(/^pay_[a-zA-Z0-9]+$/),razorpay_signature:z.string().regex(/^[a-f0-9]{64}$/i)}).strict();
function parse<T>(schema:z.ZodType<T>,raw:unknown):T{const result=schema.safeParse(raw);if(!result.success)throw new ApiError(400,'Missing or invalid payment fields. Amount must be at least ₹1.');return result.data}
export function signatureMatches(message:string,signature:string,secret:string){if(!/^[a-f0-9]{64}$/i.test(signature))return false;return timingSafeEqual(createHmac('sha256',secret).update(message).digest(),Buffer.from(signature,'hex'))}
export function paymentMode(key:string){if(key.startsWith('rzp_test_'))return 'test';if(key.startsWith('rzp_live_'))return 'live';throw new ApiError(503,'Payments are not configured yet.')}
export function paymentService(db:any,config:PaymentConfig,provider?:any){
 const key=config.RAZORPAY_KEY_ID||'',secret=config.RAZORPAY_KEY_SECRET||'',mode=paymentMode(key||'rzp_test_unconfigured');
 const enabled=!!(key&&secret),gateway=provider||(enabled?new Razorpay({key_id:key,key_secret:secret}):null);
 function requireGateway(){if(!gateway)throw new ApiError(503,'Online payments are awaiting configuration.');return gateway}
 const q=(database:any,sql:string,...values:any[])=>database.prepare(sql).bind(...values);
 const one=(database:any,sql:string,...values:any[])=>q(database,sql,...values).first();
 const all=async(database:any,sql:string,...values:any[])=>(await q(database,sql,...values).all()).results;
 async function atomic<T>(work:(database:any)=>Promise<T>):Promise<T>{if(!db.transaction)throw new ApiError(503,'Payment database transactions are unavailable.');for(let attempt=0;;attempt++){try{return await db.transaction(work)}catch(e:any){if(attempt>=2||!['40001','40P01','23505'].includes(e.code))throw e}}}
 async function account(database:any,user:string){await q(database,'INSERT INTO wallet_accounts(user_id,mode,balance,updated_at) VALUES(?,?,0,?) ON CONFLICT(user_id,mode) DO NOTHING',user,mode,Date.now()).run();return one(database,'SELECT * FROM wallet_accounts WHERE user_id=? AND mode=? FOR UPDATE',user,mode)}
 async function booking(database:any,user:string,id:string,allowPending=false){const b=await one(database,'SELECT * FROM bookings WHERE id=? FOR UPDATE',id);if(!b||b.customer_id!==user)throw new ApiError(404,'Journey not found.');if(b.status!=='completed'&&(!allowPending||b.status==='cancelled'))throw new ApiError(409,'Payment is available after your journey is completed.');return b}
 async function due(database:any,b:any){const real=await one(database,"SELECT COALESCE(SUM(CASE WHEN status='received' THEN amount ELSE -amount END),0) AS net FROM payments WHERE booking_id=?",b.id);const test=mode==='test'?await one(database,"SELECT COALESCE(SUM(amount),0) AS net FROM gateway_payments WHERE booking_id=? AND mode='test'",b.id):{net:0};return Math.max(0,Number(b.fare)-Number(real.net)-Number(test.net))}
 async function spend(database:any,user:string,b:any,amount:number,requestKey:string){
  const entry=uuid(),payment=uuid(),now=Date.now();
  const changed=await q(database,'UPDATE wallet_accounts SET balance=balance-?,updated_at=? WHERE user_id=? AND mode=? AND balance>=?',amount,now,user,mode,amount).run();
  if(!changed.meta.changes)throw new ApiError(409,'Your wallet balance is too low. Add money or pay online.');
  await q(database,"INSERT INTO wallet_entries(id,user_id,mode,amount,kind,booking_id,request_key,created_at) VALUES(?,?,?,?,'trip_payment',?,?,?)",entry,user,mode,-amount,b.id,requestKey,now).run();
  await q(database,'INSERT INTO gateway_payments(id,customer_id,mode,booking_id,amount,wallet_entry_id,created_at) VALUES(?,?,?,?,?,?,?)',payment,user,mode,b.id,amount,entry,now).run();
  // Test charges must never reconcile real receipts or fund partner payouts.
  if(mode==='live')await q(database,"INSERT INTO payments(id,booking_id,amount,method,reference,status,created_at) VALUES(?,?,?,'wallet',?,'received',?)",uuid(),b.id,amount,'wallet:'+entry,now).run();
 }
 async function wallet(actor:Actor){const driver=await driverWallet(db,mode,config).summary(actor);return atomic(async database=>{const balance=await one(database,'SELECT balance FROM wallet_accounts WHERE user_id=? AND mode=?',actor.id,mode);const records=await all(database,'SELECT id,amount,kind,booking_id,created_at FROM wallet_entries WHERE user_id=? AND mode=? ORDER BY created_at DESC LIMIT 50',actor.id,mode);const bookings=await all(database,"SELECT id,pickup,destination,fare,status FROM bookings WHERE customer_id=? AND status<>'cancelled' ORDER BY updated_at DESC LIMIT 50",actor.id);const payable=[];for(const b of bookings)payable.push({...b,due:await due(database,b)});return {mode,enabled,driver,balance:Number(balance?.balance||0),currency:'INR',entries:records,bookings:payable}})}
 async function create(actor:Actor,raw:unknown){
  requireGateway();
  const input=parse(orderInput,raw),requestKey=input.key||uuid();
  if(input.purpose!=='booking'&&input.bookingId)throw new ApiError(400,'Top-ups must not include a journey.');
  if(input.purpose==='driver_topup'&&!await one(db,"SELECT user_id FROM drivers WHERE user_id=? AND verification='approved'",actor.id))throw new ApiError(403,'An approved driver account is required for recharge.');
  const saved:any=await atomic(async database=>{
   const existing=await one(database,'SELECT * FROM gateway_orders WHERE customer_id=? AND mode=? AND request_key=?',actor.id,mode,requestKey);
   if(existing){if(existing.purpose!==input.purpose||existing.booking_id!==(input.bookingId||null)||(input.purpose!=='booking'&&existing.amount!==input.amount))throw new ApiError(409,'This payment attempt belongs to different details.');return {...existing,reused:true}}
   let amount=input.amount;
   if(input.purpose==='booking'){if(!input.bookingId)throw new ApiError(400,'Choose a journey.');const b=await booking(database,actor.id,input.bookingId,true);amount=await due(database,b);if(amount<100)throw new ApiError(409,amount===0?'This journey is already paid.':'Use your wallet for a balance below ₹1.')}
   if(!amount||amount<100)throw new ApiError(400,'Minimum amount is ₹1.');
   const id=uuid(),receipt='drz_'+id.replaceAll('-',''),now=Date.now();
   await q(database,'INSERT INTO gateway_orders(id,customer_id,mode,purpose,booking_id,amount,currency,request_key,receipt,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,actor.id,mode,input.purpose,input.bookingId||null,amount,'INR',requestKey,receipt,now,now).run();
   return {id,amount,currency:'INR',receipt,reused:false};
  });
  if(saved.external_id)return {order_id:saved.external_id,amount:saved.amount,currency:'INR',key_id:key,mode};
  if(saved.reused)throw new ApiError(409,'This order is still being prepared or has failed. Start a new payment attempt.');
  try{
   const order=await requireGateway().orders.create({amount:saved.amount,currency:'INR',receipt:saved.receipt});
   if(!/^order_[a-zA-Z0-9]+$/.test(order.id)||Number(order.amount)!==saved.amount||order.currency!=='INR')throw Error('Invalid provider order');
   await q(db,"UPDATE gateway_orders SET external_id=?,status='created',updated_at=? WHERE id=?",order.id,Date.now(),saved.id).run();
   return {order_id:order.id,amount:saved.amount,currency:'INR',key_id:key,mode};
  }catch(e:any){await q(db,"UPDATE gateway_orders SET status='failed',updated_at=? WHERE id=?",Date.now(),saved.id).run();if(e.statusCode===401)throw new ApiError(401,'Payment provider authentication failed. Contact DRIOZ support.');throw new ApiError(500,'Unable to prepare payment. Please try again.');}
 }
 async function settle(order:any,paymentId:string){
  const payment=await requireGateway().payments.fetch(paymentId);
  if(payment.order_id!==order.external_id||Number(payment.amount)!==order.amount||payment.currency!==order.currency||payment.id!==paymentId)throw new ApiError(400,'Payment details do not match this order.');
  if(payment.status!=='captured'||payment.captured!==true){if(payment.status==='authorized'){await q(db,"UPDATE gateway_orders SET status='pending',updated_at=? WHERE id=? AND status<>'credited'",Date.now(),order.id).run();return {verified:true,pending:true,mode,message:'Payment authorised. Awaiting confirmation. Refresh to check its status.'}}throw new ApiError(400,'This payment has not been completed.');}
  return atomic(async database=>{
   const current=await one(database,'SELECT * FROM gateway_orders WHERE id=? FOR UPDATE',order.id);
   if(current.status==='credited'){if(current.payment_id!==paymentId)throw new ApiError(409,'A different payment is already recorded for this order.');return {verified:true,pending:false,mode,message:'Payment already confirmed.'}}
   if(order.purpose==='driver_topup'){
    await driverAccount(database,order.customer_id,mode);const now=Date.now();
    await q(database,"UPDATE gateway_orders SET status='credited',payment_id=?,updated_at=? WHERE id=?",paymentId,now,order.id).run();
    await q(database,'UPDATE driver_accounts SET recharge=recharge+? WHERE driver_id=? AND mode=?',order.amount,order.customer_id,mode).run();
    await q(database,"INSERT INTO driver_ledger(driver_id,mode,bucket,amount,event_key,description,created_at) VALUES(?,?,'recharge',?,?,'Driver recharge confirmed',?)",order.customer_id,mode,order.amount,'recharge:'+order.id,now).run();
    return {verified:true,pending:false,mode,message:'Driver recharge added. Recharge funds cover platform deductions and cannot be withdrawn as earnings.'};
   }
   await account(database,order.customer_id);
   const now=Date.now();
   await q(database,"UPDATE gateway_orders SET status='credited',payment_id=?,updated_at=? WHERE id=?",paymentId,now,order.id).run();
   await q(database,"INSERT INTO wallet_entries(id,user_id,mode,amount,kind,order_id,created_at) VALUES(?,?,?,?,'topup',?,?)",uuid(),order.customer_id,mode,order.amount,order.id,now).run();
   await q(database,'UPDATE wallet_accounts SET balance=balance+?,updated_at=? WHERE user_id=? AND mode=?',order.amount,now,order.customer_id,mode).run();
   let paid=false;
   if(order.purpose==='booking'){const b=await booking(database,order.customer_id,order.booking_id,true);if(await due(database,b)===order.amount){await spend(database,order.customer_id,b,order.amount,'order:'+order.id);paid=true}}
   return {verified:true,pending:false,mode,message:paid?'Journey payment confirmed.':order.purpose==='booking'?'Payment confirmed. The journey balance changed, so the amount is available in your wallet.':'Money added to your wallet.'};
  });
 }
 async function verify(actor:Actor,raw:unknown){const proof=parse(proofInput,raw);const order=await one(db,'SELECT * FROM gateway_orders WHERE external_id=? AND customer_id=? AND mode=?',proof.razorpay_order_id,actor.id,mode);if(!order)throw new ApiError(404,'Payment order not found.');if(!signatureMatches(order.external_id+'|'+proof.razorpay_payment_id,proof.razorpay_signature,secret))throw new ApiError(400,'Payment signature mismatch. Payment was not recorded.');return settle(order,proof.razorpay_payment_id)}
 async function payWallet(actor:Actor,raw:unknown){const input=parse(z.object({bookingId:z.string().min(1).max(100),key:z.string().uuid()}).strict(),raw);return atomic(async database=>{await account(database,actor.id);const existing=await one(database,'SELECT booking_id FROM wallet_entries WHERE user_id=? AND mode=? AND request_key=?',actor.id,mode,input.key);if(existing){if(existing.booking_id!==input.bookingId)throw new ApiError(409,'Payment attempt belongs to a different journey.');return {success:true,mode,message:'Payment already confirmed.'}}const b=await booking(database,actor.id,input.bookingId),amount=await due(database,b);if(!amount)throw new ApiError(409,'This journey is already paid.');await spend(database,actor.id,b,amount,input.key);return {success:true,mode,message:'Journey paid from your wallet.'}})}
 async function reconcile(actor:Actor){const pending=await all(db,"SELECT * FROM gateway_orders WHERE customer_id=? AND mode=? AND external_id IS NOT NULL AND status IN ('created','pending') ORDER BY created_at DESC LIMIT 5",actor.id,mode);for(const order of pending){const payments=await requireGateway().orders.fetchPayments(order.external_id);const captured=payments.items?.find((p:any)=>p.status==='captured');if(captured)await settle(order,captured.id)}return wallet(actor)}
 async function webhook(body:string,signature:string){if(!config.RAZORPAY_WEBHOOK_SECRET)throw new ApiError(503,'Webhook is not configured.');if(!signatureMatches(body,signature,config.RAZORPAY_WEBHOOK_SECRET))throw new ApiError(400,'Invalid webhook signature.');let event:any;try{event=JSON.parse(body)}catch{throw new ApiError(400,'Invalid webhook body.')}if(['refund.processed','payment.dispute.created'].includes(event.event)){
 const paymentId=event.payload?.refund?.entity?.payment_id||event.payload?.dispute?.entity?.payment_id;
 if(paymentId)await q(db,"UPDATE driver_trip_money SET status='review' WHERE mode=? AND driver_id IN (SELECT t.driver_id FROM driver_trip_money t JOIN gateway_payments gp ON gp.booking_id=t.booking_id AND gp.mode=t.mode JOIN gateway_orders go ON go.customer_id=gp.customer_id AND go.mode=gp.mode WHERE go.payment_id=?) AND status IN ('cash','pending','available')",mode,paymentId).run();
 }if(['payment.captured','order.paid'].includes(event.event)){const p=event.payload?.payment?.entity;if(!p?.id||!p.order_id)throw new ApiError(400,'Missing payment entity.');const order=await one(db,'SELECT * FROM gateway_orders WHERE external_id=? AND mode=?',p.order_id,mode);if(order)await settle(order,p.id)}return {received:true}}
 return {wallet,create,verify,payWallet,reconcile,webhook};
}
