import {runtime} from '@/lib/runtime';
import {searchDeadline} from '@/lib/booking-search';

export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 const unavailable=()=>Response.json({message:'This checkout is unavailable. Return to the app and check payment status.'},{status:409,headers});
 if(request.headers.get('origin')!==new URL(request.url).origin)return unavailable();
 try{
  const {order,key}=await request.json() as {order?:unknown;key?:unknown};
  if(typeof order!=='string'||!/^order_[a-zA-Z0-9]+$/.test(order)||typeof key!=='string'||!/^[a-f0-9-]{36}$/i.test(key))return unavailable();
  const env=runtime();
  const gatewayKey=env.RAZORPAY_KEY_ID;
  if(!gatewayKey||!env.DB)return unavailable();
  const mode=gatewayKey.startsWith('rzp_live_')?'live':'test';
  const row=await env.DB.prepare("SELECT g.amount,g.created_at,b.status AS booking_status,b.created_at AS booking_created_at,b.scheduled_at FROM gateway_orders g LEFT JOIN bookings b ON b.id=g.booking_id WHERE g.external_id=? AND g.request_key=? AND g.mode=? AND g.status='created'").bind(order,key,mode).first();
  if(!row||Number(row.created_at)<Date.now()-15*60*1000)return unavailable();
  if(['cancelled','no_driver'].includes(row.booking_status)||row.booking_status==='requested'&&searchDeadline({created_at:Number(row.booking_created_at),scheduled_at:row.scheduled_at})<=Date.now())return unavailable();
  return Response.json({order_id:order,key_id:gatewayKey,amount:Number(row.amount),currency:'INR',mode},{headers});
 }catch{return unavailable()}
}
